import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import EmployeeSearchSelect from '../../../components/employee-search-select'
import ConfirmDialog from '../../../components/confirm-dialog'
import { useToast } from '../../../components/toast-provider'
import type { Language, Translations } from '../../../locales'
import { useAuth } from '../../auth/hooks/use-auth'
import './outing-report.css'

type OutingReportRow = {
  id: number
  reportKind: 'wfh' | 'outing'
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
type ReportEmployee = { id: number; name: string; department: string | null }
type ReportResponse = {
  data: OutingReportRow[]
  pendingCount: number
  employees: ReportEmployee[]
  submitterSignature: string | null
}
type AppliedFilters = { from: string; to: string; employeeId: string }
type ReportCellRow = OutingReportRow | null
type ReportPage = { rows: ReportCellRow[] }

const dateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
const monthBounds = (month: string) => {
  const [year, monthIndex] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = String(new Date(year, monthIndex, 0).getDate()).padStart(2, '0')
  return { from, to: `${month}-${lastDay}` }
}
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

export default function ReportPage({ translations, language }: { translations: Translations; language: Language }) {
  const copy = translations.features.report.outingReport
  const { user } = useAuth()
  const [initialBounds] = useState(() => monthBounds(dateInputValue(new Date())))
  const [from, setFrom] = useState(initialBounds.from)
  const [to, setTo] = useState(initialBounds.to)
  const [employeeId, setEmployeeId] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null)
  const [rows, setRows] = useState<OutingReportRow[]>([])
  const [employees, setEmployees] = useState<ReportEmployee[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [submitterSignature, setSubmitterSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmExport, setConfirmExport] = useState<'excel' | 'word' | 'pdf' | null>(null)
  const { showToast } = useToast()
  const isPrivileged = user?.role.name.trim().toLowerCase() === 'admin'
    || (user?.department ?? '').trim().toLowerCase() === 'hr div.'

  useEffect(() => {
    if (user && !employeeId) setEmployeeId(String(user.id))
  }, [user, employeeId])

  useEffect(() => {
    if (!user) return
    const filters = appliedFilters ?? { from: initialBounds.from, to: initialBounds.to, employeeId: String(user.id) }
    const query = new URLSearchParams(filters)
    let cancelled = false
    setLoading(true)
    setError('')
    request(`/employee-requests/outing-report?${query}`)
      .then((response) => {
        if (cancelled) return
        const result = response as ReportResponse
        setRows(result.data)
        setPendingCount(result.pendingCount)
        setEmployees(result.employees)
        setSubmitterSignature(result.submitterSignature)
        if (!appliedFilters && result.employees.some((person) => person.id === user.id)) {
          setEmployeeId(String(user.id))
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : copy.loadError)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, appliedFilters, initialBounds, copy.loadError])

  const selectedEmployeeName = employees.find((employee) => String(employee.id) === (appliedFilters?.employeeId ?? employeeId))?.name
    ?? user?.name
    ?? ''
  const departments = useMemo(() => {
    const uniqueDepartments = new Set(employees.map((employee) => employee.department).filter((department): department is string => Boolean(department)))
    return Array.from(uniqueDepartments).sort((a, b) => a.localeCompare(b, language === 'th' ? 'th' : 'en'))
  }, [employees, language])
  const filteredEmployees = useMemo(() => departmentFilter
    ? employees.filter((employee) => employee.department === departmentFilter)
    : employees, [employees, departmentFilter])
  const changeDepartment = (nextDepartment: string) => {
    setDepartmentFilter(nextDepartment)
    if (!nextDepartment) return
    const selectedId = appliedFilters?.employeeId ?? employeeId
    const selected = employees.find((employee) => String(employee.id) === selectedId)
    if (selected && selected.department !== nextDepartment) {
      const firstMatch = employees.find((employee) => employee.department === nextDepartment)
      if (firstMatch) {
        setEmployeeId(String(firstMatch.id))
        updateFilters({ from, to, employeeId: String(firstMatch.id) })
      }
    }
  }
  const employeeName = language === 'th' ? `คุณ ${selectedEmployeeName}` : selectedEmployeeName
  const dateText = (value: string) => value
    ? new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${value}T12:00:00`))
    : ''
  const headers = [
    copy.columns.kind, copy.columns.date, copy.columns.time, copy.columns.company, copy.columns.address,
    copy.columns.project, copy.columns.customer, copy.columns.position, copy.columns.phone,
    copy.columns.workDetails, copy.columns.remark,
  ]
  const rowCells = (row: OutingReportRow) => [
    row.reportKind === 'wfh' ? copy.workFromHome : copy.offsiteWork,
    row.fromDate === row.toDate ? dateText(row.fromDate) : `${dateText(row.fromDate)} – ${dateText(row.toDate)}`,
    [row.outTime, row.backTime].filter(Boolean).join('–'),
    row.companyName,
    [row.address, row.subdistrict, row.district, row.province, row.postalCode, row.country].filter(Boolean).join(' '),
    row.projectName,
    row.customerName,
    row.customerPosition,
    row.phone,
    row.workDetails,
    row.remark,
  ]
  const reportPages = (): ReportPage[] => {
    const pages: ReportPage[] = []
    for (let offset = 0; offset < rows.length; offset += 22) {
      const page: ReportCellRow[] = rows.slice(offset, offset + 22)
      while (page.length < 22) page.push(null)
      pages.push({ rows: page })
    }
    return pages
  }
  const pages = reportPages()
  const currentDate = isoDate(new Date())
  const reportFrom = appliedFilters?.from ?? initialBounds.from
  const reportTo = appliedFilters?.to ?? initialBounds.to
  const reportName = (name: string) => `Report_${name.replace(/^คุณ\s*/, '').replace(/\s+/g, '_')}_${reportFrom}_${reportTo}`

  const updateFilters = (next: AppliedFilters) => {
    setError('')
    setAppliedFilters(next)
  }

  const makeSheetHtml = (page: ReportPage, pageIndex: number) => {
    const reportRows = page.rows.map((row) => row
      ? `<tr>${rowCells(row).map((cell, index) => `<td${[4, 5, 6, 7, 9, 10].includes(index) ? ' class="l"' : ''}>${escapeHtml(cell)}</td>`).join('')}</tr>`
      : `<tr>${headers.map(() => '<td></td>').join('')}</tr>`).join('')
    const pageRows = page.rows.filter((row): row is OutingReportRow => row !== null)
    const approver = pageRows.find((row) => row.approvedBy || row.approvedSignatureImage)
    const pageMark = pages.length > 1 ? ` (${copy.sheet.page} ${pageIndex + 1}/${pages.length})` : ''
    return `<section class="rsheet">
      <h2>${escapeHtml(copy.title)}</h2>
      <div class="rl">${escapeHtml(copy.sheet.sale)} : ${escapeHtml(employeeName)}</div>
      <div class="rl">${escapeHtml(copy.sheet.date)} : ${escapeHtml(dateText(reportFrom))} - ${escapeHtml(dateText(reportTo))}${pageMark}</div>
      <table><colgroup>${[10, 15, 8, 7, 13, 8, 7, 7, 8, 10, 7].map((width) => `<col style="width:${width}%">`).join('')}</colgroup>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${reportRows}</tbody>
      </table>
      <div class="rsig">
        <div><b>${escapeHtml(copy.sheet.preparedBy)}</b><div class="sl">${submitterSignature ? `<img src="${escapeHtml(submitterSignature)}" alt="${escapeHtml(copy.sheet.signature)}">` : ''}</div>…………………………………………..<br>(${escapeHtml(employeeName)})</div>
        <div><b>${escapeHtml(copy.sheet.approvedBy)}</b><div class="sl">${approver?.approvedSignatureImage ? `<img src="${escapeHtml(approver.approvedSignatureImage)}" alt="${escapeHtml(copy.sheet.signature)}">` : ''}</div>…………………………………………..<br>( ${escapeHtml(approver?.approvedBy ?? '..................................................')} )<br>...............................................</div>
      </div>
      <div class="rnotes">${escapeHtml(copy.sheet.notesTitle)}<br>${copy.sheet.notes.map((note: string) => ` - ${escapeHtml(note)}`).join('<br>')}</div>
    </section>`
  }
  const reportHtml = () => pages.map((page, index) => makeSheetHtml(page, index)).join('')

  const downloadReport = (extension: 'xls' | 'doc') => {
    const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>Report</title>
      <style>${reportStyles}</style></head><body><div id="repPages">${reportHtml()}</div></body></html>`
    const type = extension === 'xls' ? 'application/vnd.ms-excel;charset=utf-8' : 'application/msword;charset=utf-8'
    const blob = new Blob(['\ufeff', html], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${reportName(employeeName)}.${extension}`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const runExport = () => {
    if (confirmExport === 'excel') downloadReport('xls')
    else if (confirmExport === 'word') downloadReport('doc')
    else if (confirmExport === 'pdf') window.print()
    if (confirmExport) showToast(copy.exportReady, 'success')
    setConfirmExport(null)
  }

  const filterUserId = employeeId || String(user?.id ?? '')

  return <section className="feature-page feature-page--wide outing-report-page">
    <header className="users-header outing-report-header">
      <div><p className="feature-kicker">{translations.features.report.kicker}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
    </header>
    {pendingCount > 0 && <div className="outing-report-metrics">
      <span className="outing-report-chip">{copy.pendingCount.replace('{count}', String(pendingCount))}</span>
    </div>}
    <form className="outing-report-filters" onSubmit={(event) => event.preventDefault()}>
      {isPrivileged && <label className="outing-report-department">
        <span>{copy.department}</span>
        <select value={departmentFilter} onChange={(event) => changeDepartment(event.target.value)}>
          <option value="">{copy.allDepartments}</option>
          {departments.map((department) => <option key={department} value={department}>{department}</option>)}
        </select>
      </label>}
      {(isPrivileged || employees.length > 1) && <EmployeeSearchSelect label={copy.employee} value={employeeId} options={filteredEmployees.map((employee) => ({ id: String(employee.id), name: employee.name, detail: employee.department ?? '' }))} onChange={(nextEmployeeId) => {
        setEmployeeId(nextEmployeeId)
        updateFilters({ from, to, employeeId: nextEmployeeId })
      }} />}
      <label className="outing-report-field">
        <span>{copy.from}</span>
        <input type="date" value={from} onChange={(event) => {
          const nextFrom = event.target.value
          const nextTo = to < nextFrom ? nextFrom : to
          setFrom(nextFrom)
          setTo(nextTo)
          updateFilters({ from: nextFrom, to: nextTo, employeeId: filterUserId })
        }} required />
      </label>
      <label className="outing-report-field">
        <span>{copy.to}</span>
        <input type="date" value={to} onChange={(event) => {
          const nextTo = event.target.value
          const nextFrom = from > nextTo ? nextTo : from
          setFrom(nextFrom)
          setTo(nextTo)
          updateFilters({ from: nextFrom, to: nextTo, employeeId: filterUserId })
        }} required />
      </label>
      <div className="outing-report-actions">
        <button type="button" className="is-excel" onClick={() => setConfirmExport('excel')}>{copy.exportExcel}</button>
        <button type="button" className="is-word" onClick={() => setConfirmExport('word')}>{copy.exportWord}</button>
        <button type="button" className="is-pdf" onClick={() => setConfirmExport('pdf')}>{copy.exportPdf}</button>
        <button type="button" className="is-print" onClick={() => window.print()}>{copy.print}</button>
      </div>
    </form>
    <p className="outing-report-hint">{copy.signatureHint}</p>
    {loading && <p className="outing-report-status" role="status">{copy.loading}</p>}
    {error && <p className="outing-report-error" role="alert">{error}</p>}
    {!loading && rows.length === 0 && <p className="outing-report-status">{copy.empty}</p>}
    <div className="outing-report-sheets">{pages.map((page, index) => <div className="outing-report-sheet-wrap" key={index} dangerouslySetInnerHTML={{ __html: makeSheetHtml(page, index) }} />)}</div>
    <ConfirmDialog
      open={confirmExport !== null}
      title={copy.exportConfirmTitle}
      description={confirmExport === 'pdf' ? copy.exportConfirmPdf : confirmExport === 'word' ? copy.exportConfirmWord : copy.exportConfirmExcel}
      confirmLabel={copy.confirm}
      cancelLabel={copy.cancel}
      onOpenChange={(open) => { if (!open) setConfirmExport(null) }}
      onConfirm={runExport}
    />
  </section>
}

const reportStyles = `
  body{margin:0;background:#fff;color:#000;font-family:"Sarabun","Noto Sans Thai Looped",Arial,sans-serif}
  .rsheet{width:1180px;background:#fff;color:#000;padding:20px 24px;font-family:"Sarabun","Noto Sans Thai Looped",Arial,sans-serif;font-size:12.5px;line-height:1.3;margin:0 auto 14px}
  .rsheet h2{text-align:center;font-size:22px;font-weight:700;margin:0 0 6px}
  .rsheet .rl{font-weight:700;font-size:16px}
  .rsheet table{border-collapse:collapse;width:100%;table-layout:fixed;margin-top:8px}
  .rsheet th,.rsheet td{border:1px solid #000;padding:2px 5px;vertical-align:middle;text-align:center;height:25px;word-break:break-word}
  .rsheet th{background:#e9e9e9;font-weight:700;font-size:13.5px}
  .rsheet td.l{text-align:left}
  .rsig{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px;font-size:13px}
  .rsig>div{padding-left:22%}
  .rsig .sl{height:44px;display:flex;align-items:flex-end}
  .rsig .sl img{max-height:44px;max-width:180px}
  .rnotes{margin-top:8px;font-size:12.5px;font-weight:700}
  @page{size:A4 landscape;margin:8mm}
  @media print{.rsheet{width:100%!important;margin:0!important;page-break-after:always;break-inside:avoid}}
`