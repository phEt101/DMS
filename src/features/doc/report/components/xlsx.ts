import { COLUMN_PERCENT, LEFT_ALIGNED_COLUMNS, ROWS_PER_PAGE, SIGNATURE_DOTS, dateLine, saleLine } from './model'
import type { ReportModel } from './model'
import { createSignatureLoader, downloadBlob, fitSize } from './assets'

const FONT = 'Tahoma' // มีในเครื่องเกือบทุกระบบและรองรับภาษาไทย
const COLS = COLUMN_PERCENT.length
const WIDTHS = COLUMN_PERCENT.map((p) => Math.round(p * 1.6 * 10) / 10)

const colPx = (width: number) => Math.round(width * 7 + 5)
const pxToColumn = (px: number) => {
  let acc = 0
  for (let i = 0; i < WIDTHS.length; i += 1) {
    const w = colPx(WIDTHS[i])
    if (px < acc + w) return i + (px - acc) / w
    acc += w
  }
  return WIDTHS.length - 1
}
const blockCenterPx = (fromCol: number, toCol: number) => {
  let start = 0
  for (let i = 0; i < fromCol; i += 1) start += colPx(WIDTHS[i])
  let width = 0
  for (let i = fromCol; i <= toCol; i += 1) width += colPx(WIDTHS[i])
  return start + width / 2
}
const lineCount = (text: string, width: number) =>
  text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / (width * 1.05))), 0)

export async function exportXlsx(model: ReportModel) {
  const { default: ExcelJS } = await import('exceljs')
  const { copy } = model
  const loadSignature = createSignatureLoader()
  const submitter = await loadSignature(model.submitterSignature)
  const approvers = await Promise.all(model.pages.map((page) => loadSignature(page.approverSignature)))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = model.employeeName
  workbook.title = copy.title
  workbook.created = new Date()

  const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }
  const box = { top: thin, left: thin, bottom: thin, right: thin }

  model.pages.forEach((page, pageIndex) => {
    const sheetName = `${copy.sheet.page} ${pageIndex + 1}`.replace(/[\\/?*[\]:]/g, '').slice(0, 31)
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: false }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
    })
    ws.columns = WIDTHS.map((width) => ({ width }))

    const text = (row: number, c1: number, c2: number, value: string, size: number, bold: boolean, horizontal: 'left' | 'center', height?: number, wrap = false) => {
      if (c2 > c1) ws.mergeCells(row, c1, row, c2)
      const cell = ws.getCell(row, c1)
      cell.value = value
      cell.font = { name: FONT, size, bold }
      cell.alignment = { horizontal, vertical: 'middle', wrapText: wrap }
      if (height) ws.getRow(row).height = height
    }

    // ส่วนหัว
    text(1, 1, COLS, copy.title, 16, true, 'center', 30)
    text(2, 1, COLS, saleLine(model), 11, true, 'left', 18)
    text(3, 1, COLS, dateLine(model, pageIndex), 11, true, 'left', 18)
    ws.getRow(4).height = 6

    // หัวตาราง
    const headerRow = 5
    model.headers.forEach((header, i) => {
      const cell = ws.getCell(headerRow, i + 1)
      cell.value = header
      cell.font = { name: FONT, size: 10, bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9E9E9' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = box
    })
    ws.getRow(headerRow).height = 26

    // ข้อมูล
    page.rows.forEach((cells, rowIndex) => {
      const rowNumber = headerRow + 1 + rowIndex
      let lines = 1
      for (let c = 0; c < COLS; c += 1) {
        const value = cells?.[c] ?? ''
        const cell = ws.getCell(rowNumber, c + 1)
        cell.value = value
        cell.font = { name: FONT, size: 10 }
        cell.alignment = { horizontal: LEFT_ALIGNED_COLUMNS.has(c) ? 'left' : 'center', vertical: 'middle', wrapText: true }
        cell.border = box
        lines = Math.max(lines, lineCount(value, WIDTHS[c]))
      }
      ws.getRow(rowNumber).height = Math.max(19, lines * 13 + 5)
    })

    // ลายเซ็น
    const dataEnd = headerRow + ROWS_PER_PAGE
    const labelRow = dataEnd + 2
    const imageTop = labelRow + 1 // 3 แถวสำหรับรูป
    const dotsRow = imageTop + 3
    const nameRow = dotsRow + 1
    ws.getRow(dataEnd + 1).height = 10
    ;[imageTop, imageTop + 1, imageTop + 2].forEach((r) => { ws.getRow(r).height = 16 })

    const block = (c1: number, c2: number, label: string, name: string, image: typeof submitter) => {
      text(labelRow, c1, c2, label, 10, true, 'center', 18)
      text(dotsRow, c1, c2, SIGNATURE_DOTS, 10, false, 'center', 16)
      text(nameRow, c1, c2, name, 10, false, 'center', 18)
      if (image) {
        const size = fitSize(image, 150, 44)
        const left = blockCenterPx(c1 - 1, c2 - 1) - size.width / 2
        const id = workbook.addImage({ base64: image.dataUri, extension: 'png' })
        ws.addImage(id, {
          tl: { col: pxToColumn(left), row: imageTop - 1 + (64 - size.height) / 21.33 },
          ext: size,
          editAs: 'oneCell',
        })
      }
    }
    block(1, 5, copy.sheet.preparedBy, `(${model.employeeName})`, submitter)
    block(6, COLS, copy.sheet.approvedBy, `( ${page.approverName ?? '..............................................'} )`, approvers[pageIndex])

    // หมายเหตุ
    let noteRow = nameRow + 2
    text(noteRow, 1, COLS, copy.sheet.notesTitle, 9, true, 'left', 16)
    copy.sheet.notes.forEach((note: string) => {
      noteRow += 1
      text(noteRow, 1, COLS, `- ${note}`, 9, true, 'left', Math.max(15, lineCount(note, 160) * 13 + 3), true)
    })

    ws.pageSetup.printArea = `A1:K${noteRow}`
  })

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${model.fileBase}.xlsx`,
  )
}