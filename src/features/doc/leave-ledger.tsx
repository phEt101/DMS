import { useMemo } from 'react'

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
  status: 'pending_mgr' | 'pending_hr' | 'approved' | 'rejected'
  leaveType?: 'personal' | 'sick' | 'vacation' | 'unpaid' | 'other'
  from?: string
  to?: string
  days?: number
  reason?: string
  rejectedBy?: 'manager' | 'hr'
}

const categories = ['personal', 'sick', 'vacation', 'unpaid', 'other'] as const
const formatDate = (value?: string, locale = 'th-TH') => value ? new Intl.DateTimeFormat(locale, { day:'numeric', month:'short', year:'2-digit' }).format(new Date(`${value}T00:00:00`)) : ''
const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)

export function LeaveLedger({ person, people, entries, onPersonChange, copy: c }: { person: LedgerPerson; people: LedgerPerson[]; entries: LedgerEntry[]; onPersonChange: (id: string) => void; copy: any }) {
  const labels: Record<(typeof categories)[number], string> = { personal:c.ledger.personal, sick:c.ledger.sick, vacation:c.ledger.vacation, unpaid:c.leaveTypes.unpaid, other:c.leaveTypes.other }
  const locale = c.dateLocale
  const notes: string[] = c.ledger.noteItems
  const rows = useMemo(() => [...entries].sort((a, b) => (a.from ?? '').localeCompare(b.from ?? '')).slice(0, 15), [entries])
  const used = (type: (typeof categories)[number]) => entries.filter((entry) => entry.leaveType === type && entry.status === 'approved').reduce((total, entry) => total + (entry.days ?? 0), 0)
  const printRows = Array.from({ length:15 }, (_, index) => rows[index] ?? null)
  const signatureCell = (value: string) => <td className="leave-sheet-approval">{value}</td>

  const exportCsv = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [
      [c.ledger.sequence,c.ledger.dateType,c.ledger.dateType,...categories.map((type) => labels[type]),c.ledger.totalTime,c.ledger.reason,c.ledger.requester,c.ledger.manager,c.detail.hr],
      ...printRows.map((row, index) => [index + 1, formatDate(row?.from, locale), formatDate(row?.to, locale), ...categories.map((type) => row?.leaveType === type ? row.days ?? '' : ''), row?.days ?? '', row ? c.sampleDocuments[String(row.id)]?.reason ?? row.reason ?? '' : '', row ? person.name : '', row && row.status !== 'pending_mgr' ? row.rejectedBy === 'manager' ? c.statuses.rejected : c.statuses.approved : '', row?.status === 'approved' ? c.statuses.approved : row?.status === 'pending_hr' ? c.statuses.pending : row?.rejectedBy === 'hr' ? c.statuses.rejected : '']),
    ].map((line) => line.map(quote).join(',')).join('\r\n')
    const blob = new Blob(['\ufeff', csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = `ใบลา_${person.name.replace(/\s+/g, '_')}_2569.csv`; link.click(); URL.revokeObjectURL(url)
  }
  const exportWord = () => {
    const sheet = document.querySelector('.leave-sheet')?.outerHTML ?? ''
    const blob = new Blob([`<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:4px}</style></head><body>${sheet}</body></html>`], { type:'application/msword' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = `ใบลา_${person.name.replace(/\s+/g, '_')}_2569.doc`; link.click(); URL.revokeObjectURL(url)
  }

  return <div className="leave-ledger-screen">
    <div className="leave-ledger-toolbar">
      {people.length > 1 && <label>{c.ledger.chooseEmployee}<select value={person.id} onChange={(event) => onPersonChange(event.target.value)}>{people.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
      <button type="button" className="leave-export-btn is-excel" onClick={() => { if (window.confirm(c.ledger.exportConfirmExcel)) exportCsv() }}>{c.ledger.exportExcel}</button>
      <button type="button" className="leave-export-btn is-word" onClick={() => { if (window.confirm(c.ledger.exportConfirmExcel)) exportWord() }}>{c.ledger.word}</button>
      <button type="button" className="leave-export-btn is-pdf" onClick={() => { if (window.confirm(c.ledger.exportConfirmPdf)) window.print() }}>{c.ledger.pdf}</button>
      <button type="button" className="leave-export-btn is-print" onClick={() => window.print()}>{c.ledger.print}</button>
    </div>
    <div className="leave-sheet-scroll"><article className="leave-sheet">
      <h2>{c.ledger.companyName}</h2>
      <div className="leave-sheet-info">
        <span>{c.ledger.fullName}&nbsp; {person.name}</span><span>{c.ledger.startDate}&nbsp; {formatDate(person.startDate, locale)}</span><span>{c.ledger.sick} {person.sick} {c.ledger.day}&nbsp; {c.ledger.personal} {person.personal} {c.ledger.day}</span>
        <span>{c.ledger.employeeCode}&nbsp; {person.code}&nbsp;&nbsp; {c.ledger.department} {person.department}</span><span>{c.ledger.appointedDate}&nbsp; {formatDate(person.appointedDate, locale)}</span><span>{c.ledger.annualVacation} 2569 = {person.vacation} {c.ledger.day}</span>
      </div>
      <table className="leave-sheet-table"><colgroup><col className="c-no"/><col className="c-date"/><col className="c-date"/><col className="c-type"/><col className="c-type"/><col className="c-vacation"/><col className="c-unpaid"/><col className="c-other"/><col className="c-total"/><col/><col className="c-approval"/><col className="c-review"/><col className="c-review"/></colgroup>
        <thead><tr><th rowSpan={2}>{c.ledger.sequence}</th><th colSpan={7}>{c.ledger.dateType}</th><th rowSpan={2}>{c.ledger.totalTime}</th><th rowSpan={2}>{c.ledger.reason}</th><th rowSpan={2}>{c.ledger.requester}</th><th colSpan={2}>{c.ledger.reviewResult}</th></tr><tr><th>{c.ledger.leaveDate}</th><th>{c.ledger.endDate}</th>{categories.map((type) => <th key={type}>{labels[type]}</th>)}<th>{c.ledger.manager}</th><th>{c.detail.hr}</th></tr></thead>
        <tbody>{printRows.map((entry, index) => {
          const managerResult = !entry || entry.status === 'pending_mgr' ? '' : entry.rejectedBy === 'manager' ? c.statuses.rejected : c.statuses.approved
          const hrResult = !entry ? '' : entry.status === 'approved' ? c.statuses.approved : entry.status === 'pending_hr' ? c.statuses.pending : entry.rejectedBy === 'hr' ? c.statuses.rejected : ''
          return <tr key={entry?.id ?? `empty-${index}`}><td>{index + 1}</td><td>{formatDate(entry?.from, locale)}</td><td>{formatDate(entry?.to, locale)}</td>{categories.map((type) => <td key={type}>{entry?.leaveType === type ? entry.days : ''}</td>)}<td>{entry?.days ?? ''}</td><td className="leave-sheet-reason">{entry ? c.sampleDocuments[String(entry.id)]?.reason ?? entry.reason : ''}</td>{signatureCell(entry ? person.name : '')}{signatureCell(managerResult)}{signatureCell(hrResult)}</tr>
        })}</tbody>
      </table>
      <div className="leave-sheet-footer">
        <div className="leave-balance-table"><table><thead><tr><th colSpan={3}>{c.ledger.remaining}</th></tr></thead><tbody><tr><td>{c.ledger.sick}</td><td>{person.sick - used('sick')}</td><td>{c.ledger.day}</td></tr><tr><td>{c.ledger.personal}</td><td>{person.personal - used('personal')}</td><td>{c.ledger.day}</td></tr><tr><td>{c.ledger.vacation}</td><td>{person.vacation - used('vacation')}</td><td>{c.ledger.day}</td></tr></tbody></table></div>
        <div className="leave-notes"><b>{c.ledger.notes}</b><ol>{notes.map((note) => <li key={note}>{note}</li>)}</ol></div>
        <strong className="leave-expiry">***{c.ledger.expiryNote} {c.ledger.expiryDate}***</strong>
      </div>
    </article></div>
  </div>
}
