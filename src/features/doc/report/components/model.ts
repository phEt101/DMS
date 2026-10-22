import type { Language, Translations } from '../../../../locales'

export type OutingReportRow = {
  id: number
  reportKind: 'outing'
  requestNo: string
  employeeName: string
  fromDate: string
  toDate: string
  outTime: string | null
  backTime: string | null
  companyName: string | null
  address: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  postalCode: string | null
  country: string | null
  projectName: string | null
  customerName: string | null
  customerPosition: string | null
  phone: string | null
  workDetails: string | null
  remark: string | null
  approvedBy: string | null
  approvedSignatureImage: string | null
}

export type ReportCopy = Translations['features']['report']['outingReport']

export type ReportPage = {
  /** แต่ละแถวคือ array ของข้อความ 11 คอลัมน์ หรือ null ถ้าเป็นแถวว่าง */
  rows: (string[] | null)[]
  approverName: string | null
  approverSignature: string | null
}

export type ReportModel = {
  copy: ReportCopy
  language: Language
  employeeName: string
  periodText: string
  fileBase: string
  headers: string[]
  pages: ReportPage[]
  submitterSignature: string | null
}

/** จำนวนแถวต่อ 1 แผ่น (แถวที่เหลือเติมช่องว่างให้ครบฟอร์ม) */
export const ROWS_PER_PAGE = 22
/** ความกว้างคอลัมน์เป็น % (รวม 100) ใช้ร่วมกันทั้ง HTML / xlsx / docx */
export const COLUMN_PERCENT = [7, 10, 7, 11, 17, 10, 8, 7, 8, 9, 6]
/** คอลัมน์ที่จัดชิดซ้าย: บริษัท, ที่อยู่, โครงการ, ลูกค้า, รายละเอียดงาน, หมายเหตุ */
export const LEFT_ALIGNED_COLUMNS = new Set([3, 4, 5, 6, 9, 10])
export const SIGNATURE_DOTS = '…………………………………………'

export const formatDate = (value: string, language: Language) =>
  value
    ? new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })
        .format(new Date(`${value}T12:00:00`))
    : ''

const buildCells = (row: OutingReportRow, copy: ReportCopy, language: Language): string[] => {
  const d = (value: string) => formatDate(value, language)
  return [
    copy.offsiteWork,
    row.fromDate === row.toDate ? d(row.fromDate) : `${d(row.fromDate)} – ${d(row.toDate)}`,
    [row.outTime, row.backTime].filter(Boolean).join('–'),
    row.companyName,
    [row.address, row.subdistrict, row.district, row.province, row.postalCode, row.country].filter(Boolean).join(' '),
    row.projectName,
    row.customerName,
    row.customerPosition,
    row.phone,
    row.workDetails,
    row.remark,
  ].map((cell) => cell ?? '')
}

export type BuildModelInput = {
  copy: ReportCopy
  language: Language
  employeeName: string
  from: string
  to: string
  rows: OutingReportRow[]
  submitterSignature: string | null
}

export function buildReportModel(input: BuildModelInput): ReportModel {
  const { copy, language, employeeName, from, to, rows, submitterSignature } = input
  const headers = [
    copy.columns.kind, copy.columns.date, copy.columns.time, copy.columns.company, copy.columns.address,
    copy.columns.project, copy.columns.customer, copy.columns.position, copy.columns.phone,
    copy.columns.workDetails, copy.columns.remark,
  ]
  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE))
  const pages: ReportPage[] = []
  for (let p = 0; p < pageCount; p += 1) {
    const slice = rows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE)
    const cells: (string[] | null)[] = slice.map((row) => buildCells(row, copy, language))
    while (cells.length < ROWS_PER_PAGE) cells.push(null)
    const approver = slice.find((row) => row.approvedBy || row.approvedSignatureImage)
    pages.push({
      rows: cells,
      approverName: approver?.approvedBy ?? null,
      approverSignature: approver?.approvedSignatureImage ?? null,
    })
  }
  const cleanName = employeeName.replace(/^คุณ\s*/, '').replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '')
  return {
    copy,
    language,
    employeeName,
    periodText: `${formatDate(from, language)} - ${formatDate(to, language)}`,
    fileBase: `Report_${cleanName}_${from}_${to}`,
    headers,
    pages,
    submitterSignature,
  }
}

export const saleLine = (model: ReportModel) => `${model.copy.sheet.sale} : ${model.employeeName}`
export const dateLine = (model: ReportModel, pageIndex: number) => {
  const mark = model.pages.length > 1 ? ` (${model.copy.sheet.page} ${pageIndex + 1}/${model.pages.length})` : ''
  return `${model.copy.sheet.date} : ${model.periodText}${mark}`
}