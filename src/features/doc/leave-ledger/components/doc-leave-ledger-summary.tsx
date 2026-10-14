import type { MockDocument, MockEmployee } from '../../document-types'

type Props = {
  employees: MockEmployee[]
  employee: MockEmployee
  employeeId: string
  onEmployee: (id: string) => void
  rows: MockDocument[]
  statusInfo: Record<MockDocument['status'], { label: string; className: string }>
  onExport: () => void
}

export default function DocLeaveLedgerSummary({ employees, employee, employeeId, onEmployee, rows, statusInfo, onExport }: Props) {
  const used = (keyword: string) => rows
    .filter((doc) => doc.title.includes(keyword) && doc.status === 'approved')
    .length

  return <>
    <div className="documents-ledger-summary">
      <label>เลือกพนักงาน<select value={employeeId} onChange={(event) => onEmployee(event.target.value)}>
        {employees.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
      </select></label>
      <span>ปีสิทธิ 2569</span>
      <div className="documents-balances">
        <span>ลาป่วย <b>{employee.sick} วัน · ใช้แล้ว {used('ป่วย')}</b></span>
        <span>ลากิจ <b>{employee.personal} วัน · ใช้แล้ว {used('กิจ')}</b></span>
        <span>ลาพักร้อน <b>{employee.vacation} วัน · ใช้แล้ว {used('พักร้อน')}</b></span>
      </div>
      <div className="documents-ledger-actions">
        <button className="leave-export-btn is-excel" onClick={() => { if (window.confirm('ยืนยันส่งออกสมุดบันทึกการลาเป็น Excel (CSV mock) หรือไม่?')) onExport() }}>ส่งออก Excel (CSV mock)</button>
        <button className="leave-export-btn is-pdf" onClick={() => { if (window.confirm('ยืนยันส่งออกสมุดบันทึกการลาเป็น PDF หรือไม่?')) window.print() }}>พิมพ์ / บันทึก PDF</button>
      </div>
    </div>
    <div className="documents-ledger-table-wrap"><table className="documents-ledger-table">
      <thead><tr><th>เลขที่</th><th>วันที่ / ประเภทการลา</th><th>จำนวนวัน</th><th>เหตุผล</th><th>สถานะ</th></tr></thead>
      <tbody>{rows.map((doc) => <tr key={doc.id}>
        <td>{doc.no}</td><td>{doc.summary}</td><td>{doc.title.match(/[\d.]+(?= วัน)/)?.[0] ?? '—'}</td>
        <td>{doc.summary.split('·').pop()?.trim()}</td><td><span className={`documents-pill is-${statusInfo[doc.status].className}`}>{statusInfo[doc.status].label}</span></td>
      </tr>)}</tbody>
    </table></div>
  </>
}
