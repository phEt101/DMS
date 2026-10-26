import { useMemo, useState } from 'react'
import EmployeeSearchSelect from '../../components/employee-search-select'
import ConfirmDialog from '../../components/confirm-dialog'
import { useToast } from '../../components/toast-provider'
import { exportLedgerDocx, exportLedgerPdf, exportLedgerXlsx } from './leave-ledger/exports'
import { formatLeaveDayHour } from './leave-duration'

export interface LedgerPerson {
  id: string
  name: string
  code: string
  department: string
  sick: number
  personal: number
  vacation: number
  startDate: string
  appointedDate: string
}
export interface LedgerEntry {
  id: number
  no: string
  title: string
  employee?: string
  status: 'pending_mgr' | 'pending_exec' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled'
  leaveType?: 'personal' | 'sick' | 'vacation' | 'unpaid' | 'other'
  from?: string
  to?: string
  days?: number
  medicalCertificateAvailable?: boolean
  reason?: string
  rejectedBy?: 'manager' | 'executive' | 'hr'
  signatures?: Partial<Record<'ผู้ยื่น' | 'ผู้จัดการแผนก' | 'ผู้ประกอบการ' | 'HR', { image: string; name: string; date: string }>>
  mgrSignerName?: string; mgrSignedAt?: string; execSignerName?: string; execSignedAt?: string; hrSignerName?: string; hrSignedAt?: string
}

const categories = ['personal', 'sick', 'vacation', 'unpaid', 'other'] as const
const formatDate = (value?: string, locale = 'th-TH') => value ? new Intl.DateTimeFormat(locale, { day:'numeric', month:'short', year:'2-digit' }).format(new Date(`${value}T00:00:00`)) : ''
export function LeaveLedger({ person, people, entries, onPersonChange, companyName, hoursPerDay = 8, copy: c }: { person: LedgerPerson; people: LedgerPerson[]; entries: LedgerEntry[]; onPersonChange: (id: string) => void; companyName?: string; hoursPerDay?: number; copy: any }) {
  const labels: Record<(typeof categories)[number], string> = { personal:c.ledger.personal, sick:c.ledger.sick, vacation:c.ledger.vacation, unpaid:c.leaveTypes.unpaid, other:c.leaveTypes.other }
  const locale = c.dateLocale
  const notes: string[] = c.ledger.noteItems
  const departments = useMemo(() => Array.from(new Set(people.map((employee) => employee.department).filter(Boolean))).sort(), [people])
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [confirmExport, setConfirmExport] = useState<'excel' | 'word' | 'pdf' | null>(null)
  const [exporting, setExporting] = useState(false)
  const { showToast } = useToast()
  const filteredPeople = useMemo(() => departmentFilter ? people.filter((employee) => employee.department === departmentFilter) : people, [people, departmentFilter])
  const rows = useMemo(() => [...entries].sort((a, b) => (a.from ?? '').localeCompare(b.from ?? '')).slice(0, 15), [entries])
  const used = (type: (typeof categories)[number]) => entries.filter((entry) => entry.leaveType === type && entry.status === 'approved').reduce((total, entry) => total + (entry.days ?? 0), 0)
  const printRows = Array.from({ length:15 }, (_, index) => rows[index] ?? null)
  const signatureCell = (value: string) => <td className="leave-sheet-approval">{value}</td>

  const runExport = async () => {
    const kind = confirmExport
    setConfirmExport(null)
    if (!kind) return
    setExporting(true)
    try {
      if (kind === 'excel') await exportLedgerXlsx(person, entries, companyName, hoursPerDay, c)
      else if (kind === 'word') await exportLedgerDocx(person, entries, companyName, hoursPerDay, c)
      else await exportLedgerPdf(person)
      showToast(c.ledger.exportReady, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : c.ledger.exportError, 'error')
    } finally {
      setExporting(false)
    }
  }
  const confirmDescription = confirmExport === 'pdf'
    ? c.ledger.exportConfirmPdf
    : confirmExport === 'word'
      ? c.ledger.exportConfirmWord
      : c.ledger.exportConfirmExcel

  return <div className="leave-ledger-screen">
    <div className="leave-ledger-toolbar">
      {people.length > 1 && <>
        <label className="leave-department-filter">
          <span>{c.ledger.department}</span>
          <select value={departmentFilter} onChange={(event) => {
            const nextDepartment = event.target.value
            setDepartmentFilter(nextDepartment)
            if (nextDepartment && person.department !== nextDepartment) {
              const firstMatch = people.find((employee) => employee.department === nextDepartment)
              if (firstMatch) onPersonChange(firstMatch.id)
            }
          }}>
            <option value="">{c.ledger.allDepartments}</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </label>
        <EmployeeSearchSelect label={c.ledger.chooseEmployee} value={person.id} options={filteredPeople.map((employee) => ({ id: employee.id, name: employee.name, detail: [employee.code, employee.department].filter(Boolean).join(' · ') }))} onChange={onPersonChange} />
      </>}
      <div className="leave-export-group">
        <button type="button" className="leave-export-btn is-excel" disabled={exporting} onClick={() => setConfirmExport('excel')}>{c.ledger.exportExcel}</button>
        <button type="button" className="leave-export-btn is-word" disabled={exporting} onClick={() => setConfirmExport('word')}>{c.ledger.word}</button>
        <button type="button" className="leave-export-btn is-pdf" disabled={exporting} onClick={() => setConfirmExport('pdf')}>{c.ledger.pdf}</button>
        <button type="button" className="leave-export-btn is-print" disabled={exporting} onClick={() => window.print()}>{c.ledger.print}</button>
      </div>
    </div>
    <div className="leave-sheet-scroll"><article className="leave-sheet">
      <h2>{companyName || c.ledger.companyName}</h2>
      <div className="leave-sheet-info">
        <span>{c.ledger.fullName}&nbsp; {person.name}</span><span>{c.ledger.startDate}&nbsp; {formatDate(person.startDate, locale)}</span><span>{c.ledger.sick} {person.sick} {c.ledger.day}&nbsp; {c.ledger.personal} {person.personal} {c.ledger.day}</span>
        <span>{c.ledger.employeeCode}&nbsp; {person.code}&nbsp;&nbsp; {c.ledger.department} {person.department}</span><span>{c.ledger.appointedDate}&nbsp; {formatDate(person.appointedDate, locale)}</span><span>{c.ledger.annualVacation} 2569 = {person.vacation} {c.ledger.day}</span>
      </div>
      <table className="leave-sheet-table"><colgroup><col className="c-no"/><col className="c-date"/><col className="c-date"/><col className="c-type"/><col className="c-type"/><col className="c-vacation"/><col className="c-unpaid"/><col className="c-other"/><col className="c-total"/><col/><col className="c-approval"/><col className="c-review"/><col className="c-review"/></colgroup>
        <thead><tr><th rowSpan={2}>{c.ledger.sequence}</th><th colSpan={7}>{c.ledger.dateType}</th><th rowSpan={2}>{c.ledger.totalTime}</th><th rowSpan={2}>{c.ledger.reason}</th><th rowSpan={2}>{c.ledger.requester}</th><th colSpan={2}>{c.ledger.reviewResult}</th></tr><tr><th>{c.ledger.leaveDate}</th><th>{c.ledger.endDate}</th>{categories.map((type) => <th key={type}>{labels[type]}</th>)}<th>{c.ledger.manager}</th><th>{c.detail.hr}</th></tr></thead>
        <tbody>{printRows.map((entry, index) => {
          // คอลัมน์อนุมัติ: แสดง ชื่อ + ลายเซ็น (ถ้ามี) + สถานะ + วันที่อนุมัติ
          const approvedDate = (date?: string) => date ? formatDate(date, locale) : ''
          const submitterSignature = entry?.signatures?.['ผู้ยื่น']
          const requestCell = entry && <div className="leave-approver">{submitterSignature?.image && <img className="leave-signature-img" src={submitterSignature.image} alt={`ลายเซ็น ${entry.employee}`} />}<div className="leave-approver-name">{entry.employee}</div></div>
          const mgrApproved = Boolean(entry?.mgrSignerName)
          const execApproved = Boolean(entry?.execSignerName)
          const approverSignature = entry ? entry.signatures?.[entry.mgrSignerName ? 'ผู้จัดการแผนก' : 'ผู้ประกอบการ'] : undefined
          const mgrCell = entry && (mgrApproved || execApproved) ? <div className="leave-approver">
            {approverSignature?.image && <img className="leave-signature-img" src={approverSignature.image} alt={`ลายเซ็น ${entry.mgrSignerName ?? entry.execSignerName}`} />}
            <div className="leave-approver-name">{entry.mgrSignerName ?? entry.execSignerName}</div>
            <div className="leave-approver-sub">{entry.rejectedBy === 'manager' ? <span className="leave-approver-state">{c.statuses.rejected}</span> : <span className="leave-approver-state">{c.statuses.approved} {approvedDate(entry.mgrSignedAt ?? entry.execSignedAt)}{execApproved ? ' (ผู้ประกอบการ)' : ''}</span>}</div>
          </div> : entry?.status === 'pending_mgr' ? <span className="leave-approver-state">{c.statuses.pending_mgr}</span> : entry?.status === 'pending_exec' ? <span className="leave-approver-state">{c.statuses.pending_exec}</span> : ''
          const hrSignature = entry?.signatures?.['HR']
          const hrCell = entry && entry.hrSignerName ? <div className="leave-approver">
            {hrSignature?.image && <img className="leave-signature-img" src={hrSignature.image} alt={`ลายเซ็น ${entry.hrSignerName}`} />}
            <div className="leave-approver-name">{entry.hrSignerName}</div>
            <div className="leave-approver-sub">{entry.rejectedBy === 'hr' ? <span className="leave-approver-state">{c.statuses.rejected}</span> : <span className="leave-approver-state">{c.statuses.approved} {approvedDate(entry.hrSignedAt)}</span>}</div>
          </div> : entry?.status === 'pending_hr' ? <span className="leave-approver-state">{c.statuses.pending_hr}</span> : ''
          return <tr key={entry?.id ?? `empty-${index}`}><td>{index + 1}</td><td>{formatDate(entry?.from, locale)}</td><td>{formatDate(entry?.to, locale)}</td>{categories.map((type) => <td key={type}>{entry?.leaveType === type && entry.days !== null && entry.days !== undefined ? formatLeaveDayHour(entry.days, hoursPerDay) : ''}</td>)}<td>{entry?.days !== null && entry?.days !== undefined ? formatLeaveDayHour(entry.days, hoursPerDay) : ''}</td><td className="leave-sheet-reason">{entry ? <>{c.sampleDocuments[String(entry.id)]?.reason ?? entry.reason}{entry.medicalCertificateAvailable&&<small className="leave-certificate-label">{c.ledger.certificateAttached}</small>}</> : ''}</td><td className="leave-sheet-approval">{requestCell}</td><td className="leave-sheet-approval">{mgrCell}</td><td className="leave-sheet-approval">{hrCell}</td>
          </tr>
        })}</tbody>
      </table>
      <div className="leave-sheet-footer">
        <div className="leave-balance-table"><table><thead><tr><th colSpan={3}>{c.ledger.remaining}</th></tr></thead><tbody><tr><td>{c.ledger.sick}</td><td>{formatLeaveDayHour(Math.max(0, person.sick - used('sick')), hoursPerDay)}</td><td>{c.ledger.day} / {c.ledger.hour}</td></tr><tr><td>{c.ledger.personal}</td><td>{formatLeaveDayHour(Math.max(0, person.personal - used('personal')), hoursPerDay)}</td><td>{c.ledger.day} / {c.ledger.hour}</td></tr><tr><td>{c.ledger.vacation}</td><td>{formatLeaveDayHour(Math.max(0, person.vacation - used('vacation')), hoursPerDay)}</td><td>{c.ledger.day} / {c.ledger.hour}</td></tr></tbody></table></div>
        <div className="leave-notes"><b>{c.ledger.notes}</b><ol>{notes.map((note) => <li key={note}>{note}</li>)}</ol></div>
        <strong className="leave-expiry">***{c.ledger.expiryNote} {c.ledger.expiryDate}***</strong>
      </div>
    </article></div>
    <ConfirmDialog
      open={confirmExport !== null}
      title={c.ledger.exportConfirmTitle}
      description={confirmDescription}
      confirmLabel={c.messages.confirm}
      cancelLabel={c.messages.cancel}
      onOpenChange={(open) => { if (!open) setConfirmExport(null) }}
      onConfirm={() => { void runExport() }}
    />
  </div>
}
