import { useState } from 'react'
import type { MockDocument, MockEmployee } from '../../document-types'
import EmployeeSearchSelect from '../../../../components/employee-search-select'
import ConfirmDialog from '../../../../components/confirm-dialog'
import { useToast } from '../../../../components/toast-provider'

type Props = {
  employees: MockEmployee[]
  employee: MockEmployee
  employeeId: string
  onEmployee: (id: string) => void
  rows: MockDocument[]
  statusInfo: Record<MockDocument['status'], { label: string; className: string }>
  onExport: () => void
  copy: any
}

export default function DocLeaveLedgerSummary({ employees, employee, employeeId, onEmployee, rows, statusInfo, onExport, copy: c }: Props) {
  const [confirmExport, setConfirmExport] = useState<'excel' | 'pdf' | null>(null)
  const { showToast } = useToast()
  const used = (type: 'sick' | 'personal' | 'vacation') => rows
    .filter((doc) => doc.leaveType === type && doc.status === 'approved')
    .length
  const runExport = () => {
    if (confirmExport === 'pdf') {
      setConfirmExport(null)
      showToast(c.ledger.exportReady, 'success')
      window.setTimeout(() => window.print(), 0)
      return
    }
    if (confirmExport === 'excel') onExport()
    if (confirmExport) showToast(c.ledger.exportReady, 'success')
    setConfirmExport(null)
  }

  return <>
    <div className="documents-ledger-summary">
      <EmployeeSearchSelect label={c.ledger.chooseEmployee} value={employeeId} options={employees.map((person) => ({ id: person.id, name: person.name, detail: `${person.code} · ${person.department}` }))} onChange={onEmployee} />
      <span>{c.ledger.year} 2569</span>
      <div className="documents-balances">
        <span>{c.ledger.sick} <b>{employee.sick} {c.ledger.day} · {c.ledger.used} {used('sick')}</b></span>
        <span>{c.ledger.personal} <b>{employee.personal} {c.ledger.day} · {c.ledger.used} {used('personal')}</b></span>
        <span>{c.ledger.vacation} <b>{employee.vacation} {c.ledger.day} · {c.ledger.used} {used('vacation')}</b></span>
      </div>
      <div className="documents-ledger-actions">
        <button className="leave-export-btn is-excel" onClick={() => setConfirmExport('excel')}>{c.ledger.exportExcel}</button>
        <button className="leave-export-btn is-pdf" onClick={() => setConfirmExport('pdf')}>{c.ledger.printPdf}</button>
      </div>
    </div>
    <div className="documents-ledger-table-wrap"><table className="documents-ledger-table">
      <thead><tr><th>{c.ledger.number}</th><th>{c.ledger.dateType}</th><th>{c.ledger.days}</th><th>{c.ledger.reason}</th><th>{c.fieldLabels.cert}</th><th>{c.ledger.status}</th></tr></thead>
      <tbody>{rows.map((doc) => { const sample = c.sampleDocuments[String(doc.id)] ?? {}; return <tr key={doc.id}>
        <td>{doc.no}</td><td>{sample.summary ?? doc.summary}</td><td>{doc.title.match(/[\d.]+(?= วัน)/)?.[0] ?? '—'}</td>
        <td>{sample.reason ?? doc.summary.split('·').pop()?.trim()}</td><td>{doc.medicalCertificateAvailable ? c.ledger.certificateAttached : '—'}</td><td><span className={`documents-pill is-${statusInfo[doc.status].className}`}>{statusInfo[doc.status].label}</span></td>
      </tr>})}</tbody>
    </table></div>
    <ConfirmDialog
      open={confirmExport !== null}
      title={c.ledger.exportConfirmTitle}
      description={confirmExport === 'pdf' ? c.ledger.exportConfirmPdf : c.ledger.exportConfirmExcel}
      confirmLabel={c.messages.confirm}
      cancelLabel={c.messages.cancel}
      onOpenChange={(open) => { if (!open) setConfirmExport(null) }}
      onConfirm={runExport}
    />
  </>
}
