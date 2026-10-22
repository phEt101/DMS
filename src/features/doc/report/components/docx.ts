import {
  AlignmentType, BorderStyle, Document, HeightRule, ImageRun, LineRuleType, Packer, PageOrientation,
  Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx'
import { COLUMN_PERCENT, LEFT_ALIGNED_COLUMNS, SIGNATURE_DOTS, dateLine, saleLine } from './model'
import type { ReportModel } from './model'
import { createSignatureLoader, downloadBlob, fitSize } from './assets'
import type { SignatureImage } from './assets'

const FONT = 'Tahoma'
// A4 แนวนอน (หน่วย twip): ขอบ 0.8 ซม. ซ้าย-ขวา ~1 ซม.
const PAGE = { width: 11906, height: 16838 }
const MARGIN = { top: 454, bottom: 454, left: 567, right: 567 }
const CONTENT_WIDTH = PAGE.height - MARGIN.left - MARGIN.right

const run = (text: string, size: number, bold = false) => text.split('\n').map((line, i) => new TextRun({
  text: line,
  break: i > 0 ? 1 : undefined,
  font: FONT,
  size,
  bold,
  sizeComplexScript: size,   // ภาษาไทยใช้ขนาด complex-script
  boldComplexScript: bold,
}))

const para = (text: string, size: number, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) =>
  new Paragraph({
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: { before: 0, after: opts.after ?? 0, line: 240 },
    children: run(text, size, opts.bold),
  })

const columnWidths = (() => {
  const widths = COLUMN_PERCENT.map((p) => Math.floor((CONTENT_WIDTH * p) / 100))
  widths[widths.length - 1] += CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0)
  return widths
})()

const none = { style: BorderStyle.NONE, size: 0, color: 'auto' }
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }

const signatureCell = (label: string, name: string, image: SignatureImage | null) => {
  const size = image ? fitSize(image, 150, 44) : null
  return new TableCell({
    width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
    borders: { top: none, bottom: none, left: none, right: none },
    children: [
      para(label, 20, { bold: true, align: AlignmentType.CENTER }),
      image && size
        ? new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 0 },
            children: [new ImageRun({ type: 'png', data: image.bytes, transformation: size })],
          })
        : new Paragraph({ spacing: { before: 600, after: 0 }, children: [] }),
      para(SIGNATURE_DOTS, 20, { align: AlignmentType.CENTER }),
      para(name, 20, { align: AlignmentType.CENTER }),
    ],
  })
}

export async function exportDocx(model: ReportModel) {
  const { copy } = model
  const loadSignature = createSignatureLoader()
  const submitter = await loadSignature(model.submitterSignature)
  const approvers = await Promise.all(model.pages.map((page) => loadSignature(page.approverSignature)))

  const sections = model.pages.map((page, pageIndex) => {
    const headerRow = new TableRow({
      tableHeader: true,
      cantSplit: true,
      height: { value: 340, rule: HeightRule.ATLEAST },
      children: model.headers.map((header, i) => new TableCell({
        width: { size: columnWidths[i], type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E9E9E9' },
        margins: { top: 20, bottom: 20, left: 50, right: 50 },
        children: [para(header, 17, { bold: true, align: AlignmentType.CENTER })],
      })),
    })

    const dataRows = page.rows.map((cells) => new TableRow({
      cantSplit: true,
      height: { value: 280, rule: HeightRule.ATLEAST },
      children: COLUMN_PERCENT.map((_, i) => new TableCell({
        width: { size: columnWidths[i], type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 15, bottom: 15, left: 50, right: 50 },
        children: [para(cells?.[i] ?? '', 16, {
          align: LEFT_ALIGNED_COLUMNS.has(i) ? AlignmentType.LEFT : AlignmentType.CENTER,
        })],
      })),
    }))

    const signatureTable = new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [Math.floor(CONTENT_WIDTH / 2), Math.floor(CONTENT_WIDTH / 2)],
      layout: TableLayoutType.FIXED,
      borders: noBorders,
      rows: [new TableRow({
        cantSplit: true,
        children: [
          signatureCell(copy.sheet.preparedBy, `(${model.employeeName})`, submitter),
          signatureCell(copy.sheet.approvedBy, `( ${page.approverName ?? '..............................................'} )`, approvers[pageIndex]),
        ],
      })],
    })

    return {
      properties: {
        page: {
          size: { width: PAGE.width, height: PAGE.height, orientation: PageOrientation.LANDSCAPE },
          margin: MARGIN,
        },
      },
      children: [
        para(copy.title, 30, { bold: true, align: AlignmentType.CENTER, after: 40 }),
        para(saleLine(model), 21, { bold: true }),
        para(dateLine(model, pageIndex), 21, { bold: true, after: 80 }),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths,
          layout: TableLayoutType.FIXED,
          rows: [headerRow, ...dataRows],
        }),
        // ต้องมี paragraph คั่นระหว่าง 2 ตาราง ไม่เช่นนั้น Word จะรวมเป็นตารางเดียว
        new Paragraph({ spacing: { before: 0, after: 0, line: 160, lineRule: LineRuleType.EXACT }, children: [] }),
        signatureTable,
        new Paragraph({ spacing: { before: 60, after: 0 }, children: run(copy.sheet.notesTitle, 16, true) }),
        ...copy.sheet.notes.map((note: string) => para(`- ${note}`, 16, { bold: true })),
      ],
    }
  })

  const doc = new Document({
    creator: model.employeeName,
    title: copy.title,
    styles: { default: { document: { run: { font: FONT, size: 18 } } } },
    sections,
  })
  downloadBlob(await Packer.toBlob(doc), `${model.fileBase}.docx`)
}