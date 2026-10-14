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
const labels: Record<(typeof categories)[number], string> = {
  personal: 'กิจ', sick: 'ป่วย', vacation: 'พักร้อน', unpaid: 'ลากิจไม่รับค่าจ้าง', other: 'อื่น ๆ',
}
const notes = [
  '1. การลาป่วยต้องเขียนใบลาทันทีที่กลับมาทำงาน ลาป่วยวันแรกและวันสุดท้ายของสัปดาห์ วันคร่อมวันหยุดต่อเนื่อง หรือลาป่วย 3 วันทำงานขึ้นไป ต้องแสดงใบรับรองแพทย์ทุกครั้ง',
  '2. การลากิจหรือลากิจไม่รับค่าจ้างต้องเขียนใบลาล่วงหน้าไม่น้อยกว่า 1 วัน และได้รับอนุมัติจากผู้บังคับบัญชาก่อนทุกครั้ง',
  '3. การลาพักร้อนต้องเขียนใบลาล่วงหน้าไม่น้อยกว่า 15 วัน และได้รับอนุมัติจากผู้บังคับบัญชาก่อนทุกครั้ง',
  '4. ผู้ลาต้องเขียนใบลาตามระเบียบว่าด้วยการลาประเภทต่าง ๆ และเสนอให้ผู้บังคับบัญชาพิจารณาเห็นชอบก่อนส่งให้แผนกบุคคลบันทึกเวลา',
]
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('th-TH', { day:'numeric', month:'short', year:'2-digit' }).format(new Date(`${value}T00:00:00`)) : ''
const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)

export function LeaveLedger({ person, people, entries, onPersonChange }: { person: LedgerPerson; people: LedgerPerson[]; entries: LedgerEntry[]; onPersonChange: (id: string) => void }) {
  const rows = useMemo(() => [...entries].sort((a, b) => (a.from ?? '').localeCompare(b.from ?? '')).slice(0, 15), [entries])
  const used = (type: (typeof categories)[number]) => entries.filter((entry) => entry.leaveType === type && entry.status === 'approved').reduce((total, entry) => total + (entry.days ?? 0), 0)
  const printRows = Array.from({ length:15 }, (_, index) => rows[index] ?? null)
  const signatureCell = (value: string) => <td className="leave-sheet-approval">{value}</td>

  const exportCsv = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [
      ['ลำดับ','วันที่ลา','ถึงวันที่','กิจ','ป่วย','พักร้อน','ลากิจไม่รับค่าจ้าง','อื่น ๆ','รวมเวลา','เหตุผลการลา','ผู้ขออนุมัติ','ผู้จัดการแผนก','HR'],
      ...printRows.map((row, index) => [index + 1, formatDate(row?.from), formatDate(row?.to), ...categories.map((type) => row?.leaveType === type ? row.days ?? '' : ''), row?.days ?? '', row?.reason ?? '', row ? person.name : '', row && row.status !== 'pending_mgr' ? row.rejectedBy === 'manager' ? 'ไม่อนุมัติ' : 'อนุมัติ' : '', row?.status === 'approved' ? 'อนุมัติ' : row?.status === 'pending_hr' ? 'รอพิจารณา' : row?.rejectedBy === 'hr' ? 'ไม่อนุมัติ' : '']),
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
      {people.length > 1 && <label>เลือกพนักงาน<select value={person.id} onChange={(event) => onPersonChange(event.target.value)}>{people.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
      <button type="button" className="leave-export-btn is-excel" onClick={() => { if (window.confirm('ยืนยันส่งออกสมุดบันทึกการลาเป็น Excel หรือไม่?')) exportCsv() }}>ส่งออก Excel</button>
      <button type="button" className="leave-export-btn is-word" onClick={() => { if (window.confirm('ยืนยันส่งออกสมุดบันทึกการลาเป็น Word หรือไม่?')) exportWord() }}>ส่งออก Word</button>
      <button type="button" className="leave-export-btn is-pdf" onClick={() => { if (window.confirm('ยืนยันส่งออกสมุดบันทึกการลาเป็น PDF หรือไม่?')) window.print() }}>ส่งออก PDF</button>
      <button type="button" className="leave-export-btn is-print" onClick={() => window.print()}>พิมพ์</button>
    </div>
    <div className="leave-sheet-scroll"><article className="leave-sheet">
      <h2>บริษัท บอสเวลล์ คอนเนคชั่น กรุ๊ป จำกัด</h2>
      <div className="leave-sheet-info">
        <span>ชื่อ - นามสกุล&nbsp; {person.name}</span><span>วันที่เริ่มทำงาน&nbsp; {formatDate(person.startDate)}</span><span>ลาป่วย {person.sick} วัน&nbsp; ลากิจ {person.personal} วัน</span>
        <span>รหัสประจำตัว&nbsp; {person.code}&nbsp;&nbsp; แผนก {person.department}</span><span>วันที่บรรจุงาน&nbsp; {formatDate(person.appointedDate)}</span><span>วันลาพักร้อนของปี 2569 = {person.vacation} วัน</span>
      </div>
      <table className="leave-sheet-table"><colgroup><col className="c-no"/><col className="c-date"/><col className="c-date"/><col className="c-type"/><col className="c-type"/><col className="c-vacation"/><col className="c-unpaid"/><col className="c-other"/><col className="c-total"/><col/><col className="c-approval"/><col className="c-review"/><col className="c-review"/></colgroup>
        <thead><tr><th rowSpan={2}>ลำดับ</th><th colSpan={7}>วันที่ / ประเภทการลา</th><th rowSpan={2}>รวมเวลา</th><th rowSpan={2}>เหตุผลการลา</th><th rowSpan={2}>ผู้ขออนุมัติ</th><th colSpan={2}>ผลการพิจารณา</th></tr><tr><th>วันที่ลา</th><th>ถึงวันที่</th>{categories.map((type) => <th key={type}>{labels[type]}</th>)}<th>ผู้จัดการแผนก</th><th>HR</th></tr></thead>
        <tbody>{printRows.map((entry, index) => {
          const managerResult = !entry || entry.status === 'pending_mgr' ? '' : entry.rejectedBy === 'manager' ? 'ไม่อนุมัติ' : 'อนุมัติ'
          const hrResult = !entry ? '' : entry.status === 'approved' ? 'อนุมัติ' : entry.status === 'pending_hr' ? 'รอพิจารณา' : entry.rejectedBy === 'hr' ? 'ไม่อนุมัติ' : ''
          return <tr key={entry?.id ?? `empty-${index}`}><td>{index + 1}</td><td>{formatDate(entry?.from)}</td><td>{formatDate(entry?.to)}</td>{categories.map((type) => <td key={type}>{entry?.leaveType === type ? entry.days : ''}</td>)}<td>{entry?.days ?? ''}</td><td className="leave-sheet-reason">{entry?.reason ?? ''}</td>{signatureCell(entry ? person.name : '')}{signatureCell(managerResult)}{signatureCell(hrResult)}</tr>
        })}</tbody>
      </table>
      <div className="leave-sheet-footer">
        <div className="leave-balance-table"><table><thead><tr><th colSpan={3}>วันลาคงเหลือ</th></tr></thead><tbody><tr><td>ลาป่วย</td><td>{person.sick - used('sick')}</td><td>วัน</td></tr><tr><td>ลากิจ</td><td>{person.personal - used('personal')}</td><td>วัน</td></tr><tr><td>ลาพักร้อน</td><td>{person.vacation - used('vacation')}</td><td>วัน</td></tr></tbody></table></div>
        <div className="leave-notes"><b>หมายเหตุ</b><ol>{notes.map((note) => <li key={note}>{note}</li>)}</ol></div>
        <strong className="leave-expiry">***สิทธิวันลาสามารถใช้ได้ถึงวันที่ 25 พฤศจิกายน 2569***</strong>
      </div>
    </article></div>
  </div>
}
