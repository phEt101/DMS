import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import EmployeeSearchSelect from '../../../components/employee-search-select'
import ConfirmDialog from '../../../components/confirm-dialog'
import { useToast } from '../../../components/toast-provider'
import type { Language, Translations } from '../../../locales'
import { useAuth } from '../../auth/hooks/use-auth'
import { buildReportModel } from './components/model'
import type { OutingReportRow } from './components/model'
import { buildSheetHtml, sheetCss } from './components/sheet-html'
import { exportXlsx } from './components/xlsx'
import { exportDocx } from './components/docx'
import { exportPdf } from './components/pdf'
import './outing-report.css'

type ReportEmployee = { id: number; name: string; department: string | null }
type ReportResponse = {
  data: OutingReportRow[]
  pendingCount: number
  employees: ReportEmployee[]
  submitterSignature: string | null
}
type AppliedFilters = { from: string; to: string; employeeId: string }
type ExportKind = 'excel' | 'word' | 'pdf'

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
  const [confirmExport, setConfirmExport] = useState<ExportKind | null>(null)
  const [exporting, setExporting] = useState<ExportKind | null>(null)
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
    const unique = new Set(employees.map((employee) => employee.department).filter((department): department is string => Boolean(department)))
    return Array.from(unique).sort((a, b) => a.localeCompare(b, language === 'th' ? 'th' : 'en'))
  }, [employees, language])
  const filteredEmployees = useMemo(() => departmentFilter
    ? employees.filter((employee) => employee.department === departmentFilter)
    : employees, [employees, departmentFilter])

  const updateFilters = (next: AppliedFilters) => {
    setError('')
    setAppliedFilters(next)
  }
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
  const reportFrom = appliedFilters?.from ?? initialBounds.from
  const reportTo = appliedFilters?.to ?? initialBounds.to

  // โมเดลกลางตัวเดียว ใช้ทั้ง preview / xlsx / docx / pdf
  const model = useMemo(() => buildReportModel({
    copy, language, employeeName, from: reportFrom, to: reportTo, rows, submitterSignature,
  }), [copy, language, employeeName, reportFrom, reportTo, rows, submitterSignature])

  const runExport = async (kind: ExportKind | null = confirmExport) => {
    setConfirmExport(null)
    if (!kind) return
    setExporting(kind)
    try {
      if (kind === 'excel') await exportXlsx(model)
      else if (kind === 'word') await exportDocx(model)
      else await exportPdf(model)
      showToast(copy.exportReady, 'success')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : copy.loadError, 'error')
    } finally {
      setExporting(null)
    }
  }

  const filterUserId = employeeId || String(user?.id ?? '')
  const busy = exporting !== null

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
        <button type="button" className="is-excel" disabled={busy} onClick={() => setConfirmExport('excel')}>{copy.exportExcel}</button>
        <button type="button" className="is-word" disabled={busy} onClick={() => setConfirmExport('word')}>{copy.exportWord}</button>
        <button type="button" className="is-pdf" disabled={busy} onClick={() => setConfirmExport('pdf')}>{copy.exportPdf}</button>
        <button type="button" className="is-print" disabled={busy} onClick={() => window.print()}>{copy.print}</button>
      </div>
    </form>
    <p className="outing-report-hint">{copy.signatureHint}</p>
    {loading && <p className="outing-report-status" role="status">{copy.loading}</p>}
    {error && <p className="outing-report-error" role="alert">{error}</p>}
    {!loading && rows.length === 0 && <p className="outing-report-status">{copy.empty}</p>}
    <style>{sheetCss}</style>
    <div className="outing-report-sheets">
      {model.pages.map((page, index) => (
        <div className="outing-report-paper" key={index} dangerouslySetInnerHTML={{ __html: buildSheetHtml(model, page, index) }} />
      ))}
    </div>
    <ConfirmDialog
      open={confirmExport !== null}
      title={copy.exportConfirmTitle}
      description={confirmExport === 'pdf' ? copy.exportConfirmPdf : confirmExport === 'word' ? copy.exportConfirmWord : copy.exportConfirmExcel}
      confirmLabel={copy.confirm}
      cancelLabel={copy.cancel}
      onOpenChange={(open) => { if (!open) setConfirmExport(null) }}
      onConfirm={() => { void runExport() }}
    />
  </section>
}