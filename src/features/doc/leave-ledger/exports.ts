import type { LedgerEntry, LedgerPerson } from '../leave-ledger'
import { downloadBlob } from '../report/components/assets'
import { formatLeaveDayHour } from '../leave-duration'

const leaveTypes = ['personal', 'sick', 'vacation', 'unpaid', 'other'] as const

const safeFilePart = (value: string) =>
  value.trim().replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '')

const formatDate = (value: string | undefined, locale: string) => value
  ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: '2-digit' })
      .format(new Date(`${value}T00:00:00`))
  : ''

const rowsForExport = (person: LedgerPerson, entries: LedgerEntry[], hoursPerDay: number, copy: any) => {
  const labels: Record<(typeof leaveTypes)[number], string> = {
    personal: copy.ledger.personal,
    sick: copy.ledger.sick,
    vacation: copy.ledger.vacation,
    unpaid: copy.leaveTypes.unpaid,
    other: copy.leaveTypes.other,
  }
  const rows = [...entries]
    .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''))
    .slice(0, 15)
  const headers = [
    copy.ledger.sequence,
    copy.ledger.leaveDate,
    copy.ledger.endDate,
    ...leaveTypes.map((type) => labels[type]),
    copy.ledger.totalTime,
    copy.ledger.reason,
    copy.ledger.requester,
    copy.ledger.manager,
    copy.detail.hr,
  ]
  const data = Array.from({ length: 15 }, (_, index) => {
    const entry = rows[index]
    const managerStatus = entry?.mgrSignerName ?? entry?.execSignerName
      ?? (entry?.status === 'pending_mgr' ? copy.statuses.pending_mgr
        : entry?.status === 'pending_exec' ? copy.statuses.pending_exec : '')
    const hrStatus = entry?.hrSignerName
      ?? (entry?.status === 'pending_hr' ? copy.statuses.pending_hr : '')
    return [
      index + 1,
      formatDate(entry?.from, copy.dateLocale),
      formatDate(entry?.to, copy.dateLocale),
      ...leaveTypes.map((type) => entry?.leaveType === type && entry.days !== null && entry.days !== undefined ? formatLeaveDayHour(entry.days, hoursPerDay) : ''),
      entry?.days !== null && entry?.days !== undefined ? formatLeaveDayHour(entry.days, hoursPerDay) : '',
      entry ? copy.sampleDocuments[String(entry.id)]?.reason ?? entry.reason ?? '' : '',
      entry ? person.name : '',
      managerStatus,
      hrStatus,
    ]
  })
  return { headers, data, labels }
}

const balanceRows = (person: LedgerPerson, entries: LedgerEntry[], hoursPerDay: number, copy: any) => {
  const used = (type: (typeof leaveTypes)[number]) => entries
    .filter((entry) => entry.leaveType === type && entry.status === 'approved')
    .reduce((total, entry) => total + (entry.days ?? 0), 0)
  return [
    [copy.ledger.sick, formatLeaveDayHour(person.sick, hoursPerDay), formatLeaveDayHour(used('sick'), hoursPerDay), formatLeaveDayHour(Math.max(0, person.sick - used('sick')), hoursPerDay), `${copy.ledger.day} / ${copy.ledger.hour}`],
    [copy.ledger.personal, formatLeaveDayHour(person.personal, hoursPerDay), formatLeaveDayHour(used('personal'), hoursPerDay), formatLeaveDayHour(Math.max(0, person.personal - used('personal')), hoursPerDay), `${copy.ledger.day} / ${copy.ledger.hour}`],
    [copy.ledger.vacation, formatLeaveDayHour(person.vacation, hoursPerDay), formatLeaveDayHour(used('vacation'), hoursPerDay), formatLeaveDayHour(Math.max(0, person.vacation - used('vacation')), hoursPerDay), `${copy.ledger.day} / ${copy.ledger.hour}`],
  ]
}

const reportName = (person: LedgerPerson, policyYear: number) => `Leave_Ledger_${safeFilePart(person.name)}_${policyYear}`

export async function exportLedgerXlsx(person: LedgerPerson, entries: LedgerEntry[], companyName: string | undefined, hoursPerDay: number, policyYear: number, copy: any) {
  const { default: ExcelJS } = await import('exceljs')
  const { headers, data } = rowsForExport(person, entries, hoursPerDay, copy)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = person.name
  workbook.title = copy.ledger.title ?? copy.ledger.companyName
  const sheet = workbook.addWorksheet('Leave ledger', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  })
  sheet.columns = [7, 12, 12, 9, 9, 10, 12, 9, 22, 18, 22, 22, 22].map((width) => ({ width }))
  sheet.mergeCells(1, 1, 1, headers.length)
  sheet.getCell(1, 1).value = companyName || copy.ledger.companyName
  sheet.getCell(1, 1).font = { name: 'Tahoma', size: 16, bold: true }
  sheet.getCell(1, 1).alignment = { horizontal: 'center' }
  sheet.mergeCells(2, 1, 2, headers.length)
  sheet.getCell(2, 1).value = `${copy.ledger.fullName}: ${person.name}    ${copy.ledger.employeeCode}: ${person.code}    ${copy.ledger.department}: ${person.department}`
  sheet.getCell(2, 1).font = { name: 'Tahoma', size: 11, bold: true }
  sheet.mergeCells(3, 1, 3, headers.length)
  sheet.getCell(3, 1).value = `${copy.ledger.startDate}: ${formatDate(person.startDate, copy.dateLocale)}    ${copy.ledger.appointedDate}: ${formatDate(person.appointedDate, copy.dateLocale)}    ${copy.ledger.annualVacation} ${policyYear}: ${person.vacation} ${copy.ledger.day}`
  sheet.getCell(3, 1).font = { name: 'Tahoma', size: 10 }

  const border = { style: 'thin' as const, color: { argb: 'FF000000' } }
  const headerRow = sheet.addRow(headers)
  headerRow.height = 30
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Tahoma', size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9E9E9' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { top: border, bottom: border, left: border, right: border }
  })
  data.forEach((values) => {
    const row = sheet.addRow(values)
    row.height = 28
    row.eachCell((cell, column) => {
      cell.font = { name: 'Tahoma', size: 9 }
      cell.alignment = { horizontal: column > 9 ? 'left' : 'center', vertical: 'middle', wrapText: true }
      cell.border = { top: border, bottom: border, left: border, right: border }
    })
  })

  sheet.addRow([])
  sheet.addRow([copy.ledger.remaining])
  sheet.addRow([copy.ledger.sick, copy.ledger.year, copy.ledger.used, copy.ledger.remaining, copy.ledger.day])
  balanceRows(person, entries, hoursPerDay, copy).forEach((row) => sheet.addRow(row))

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${reportName(person, policyYear)}.xlsx`,
  )
}

export async function exportLedgerDocx(person: LedgerPerson, entries: LedgerEntry[], companyName: string | undefined, hoursPerDay: number, policyYear: number, copy: any) {
  const {
    AlignmentType, BorderStyle, Document, PageOrientation, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
  } = await import('docx')
  const { headers, data } = rowsForExport(person, entries, hoursPerDay, copy)
  const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
  const borders = { top: border, bottom: border, left: border, right: border }
  const cell = (value: unknown, header = false) => new TableCell({
    borders,
    width: { size: 1200, type: WidthType.DXA },
    children: [new Paragraph({
      alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(value ?? ''), bold: header, font: 'Tahoma', size: header ? 14 : 12 })],
    })],
  })
  const tableRows = [
    new TableRow({ tableHeader: true, children: headers.map((header) => cell(header, true)) }),
    ...data.map((row) => new TableRow({ cantSplit: true, children: row.map((value) => cell(value)) })),
  ]
  const balances = balanceRows(person, entries, hoursPerDay, copy)
  const doc = new Document({
    creator: person.name,
    title: `${copy.ledger.companyName} - ${person.name}`,
    sections: [{
      properties: { page: { size: { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE }, margin: { top: 500, bottom: 500, left: 500, right: 500 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: companyName || copy.ledger.companyName, bold: true, font: 'Tahoma', size: 28 })] }),
        new Paragraph({ children: [new TextRun({ text: `${copy.ledger.fullName}: ${person.name}    ${copy.ledger.employeeCode}: ${person.code}    ${copy.ledger.department}: ${person.department}`, font: 'Tahoma', size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `${copy.ledger.startDate}: ${formatDate(person.startDate, copy.dateLocale)}    ${copy.ledger.appointedDate}: ${formatDate(person.appointedDate, copy.dateLocale)}    ${copy.ledger.annualVacation} ${policyYear}: ${person.vacation} ${copy.ledger.day}`, font: 'Tahoma', size: 18 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
        new Paragraph({ children: [new TextRun({ text: copy.ledger.remaining, bold: true, font: 'Tahoma', size: 18 })] }),
        new Table({
          width: { size: 45, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [copy.ledger.sick, copy.ledger.year, copy.ledger.used, copy.ledger.remaining, copy.ledger.day].map((value) => cell(value, true)) }),
            ...balances.map((row) => new TableRow({ children: row.map((value) => cell(value)) })),
          ],
        }),
        ...copy.ledger.noteItems.map((note: string) => new Paragraph({ children: [new TextRun({ text: `- ${note}`, font: 'Tahoma', size: 16 })] })),
      ],
    }],
  })
  downloadBlob(await Packer.toBlob(doc), `${reportName(person, policyYear)}.docx`)
}

export async function exportLedgerPdf(person: LedgerPerson, policyYear: number) {
  const sheet = document.querySelector<HTMLElement>('.leave-sheet')
  if (!sheet) throw new Error('Leave ledger is not available for export')
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const clone = sheet.cloneNode(true) as HTMLElement
  clone.style.width = `${sheet.scrollWidth}px`
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:max-content;background:#fff;pointer-events:none'
  host.appendChild(clone)
  document.body.appendChild(host)
  try {
    await Promise.all(Array.from(clone.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)))
    const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
    const margin = 8
    const maxWidth = 297 - margin * 2
    const maxHeight = 210 - margin * 2
    const ratio = canvas.width / canvas.height
    const width = Math.min(maxWidth, maxHeight * ratio)
    const height = width / ratio
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (297 - width) / 2, (210 - height) / 2, width, height)
    pdf.setProperties({ title: reportName(person, policyYear), author: person.name })
    downloadBlob(pdf.output('blob'), `${reportName(person, policyYear)}.pdf`)
  } finally {
    host.remove()
  }
}
