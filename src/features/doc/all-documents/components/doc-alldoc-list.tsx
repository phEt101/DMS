import type { KeyboardEvent } from 'react'
import type { IconType } from 'react-icons'
import type { DocKind, MockDocument, MockEmployee } from '../../document-types'
type Props = {
  documents: MockDocument[]
  layout: 'grid' | 'list'
  mockRole: MockEmployee['role']
  kindInfo: Record<DocKind, { title: string; icon: IconType }>
  statusInfo: Record<MockDocument['status'], { label: string }>
  dateText: (value: string) => string
  onSelect: (id: number) => void
  onCancel: (id: number) => void
}
const statusClass = (status: MockDocument['status']) => status === 'approved' ? 'is-done' : status === 'rejected' ? 'is-cancelled' : 'is-submitted'
function activateOnKey(event: KeyboardEvent<HTMLElement>, action: () => void) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action() } }
export default function DocAllDocumentsList({ documents, layout, mockRole, kindInfo, statusInfo, dateText, onSelect, onCancel }: Props) {
  if (!documents.length) return <div className="documents-empty">ไม่พบเอกสาร ลองเปลี่ยนคำค้นหาหรือตัวกรอง</div>
  if (layout === 'grid') return <div className="dms-card-grid dms-survey-grid documents-survey-grid">{documents.map((doc) => {
    const Icon=kindInfo[doc.kind].icon
    return <article className="dms-project-card documents-survey-card" key={doc.id} role="button" tabIndex={0} aria-label={`ดูรายละเอียด ${doc.title}`} onClick={()=>onSelect(doc.id)} onKeyDown={(event)=>activateOnKey(event,()=>onSelect(doc.id))}>
      <div className="dms-card-head"><span className="dms-project-icon-pill"><Icon/></span><div className="dms-project-actions"><span className={`dms-card-status ${statusClass(doc.status)}`}>{statusInfo[doc.status].label}</span></div></div>
      <h3 className="dms-card-name">{doc.title}</h3>
      <div className="dms-card-foot"><div className="dms-card-meta">{doc.no} · {kindInfo[doc.kind].title} · {dateText(doc.date)}</div><div className="dms-card-line">{doc.employee} · {doc.department}</div><div className="dms-card-line">{doc.summary}</div>{doc.note&&<div className="dms-card-line documents-card-note">หมายเหตุ: {doc.note}</div>}{doc.status==='pending_mgr'&&mockRole==='พนักงาน'&&doc.employee==='สมชาย ใจดี'&&<button type="button" className="documents-cancel-card" onClick={event=>{event.stopPropagation();onCancel(doc.id)}}>ยกเลิกเอกสาร</button>}</div>
    </article>
  })}</div>
  return <div className="dms-project-table-wrap"><table className="dms-project-table"><thead><tr><th>เลขที่ / ประเภทเอกสาร</th><th>รายละเอียด</th><th>ผู้ยื่น</th><th>วันที่ยื่น</th><th>สถานะ</th></tr></thead><tbody>{documents.map(doc=>{const Icon=kindInfo[doc.kind].icon;return <tr key={doc.id} role="button" tabIndex={0} onClick={()=>onSelect(doc.id)} onKeyDown={event=>activateOnKey(event,()=>onSelect(doc.id))}><td><div className="dms-table-document"><span className="dms-project-icon-pill"><Icon/></span><span>{doc.no} · {kindInfo[doc.kind].title}</span></div></td><td>{doc.title}<small className="documents-table-summary">{doc.summary}</small></td><td>{doc.employee}<small className="documents-table-summary">{doc.department}</small></td><td>{dateText(doc.date)}</td><td><span className={`dms-card-status ${statusClass(doc.status)}`}>{statusInfo[doc.status].label}</span></td></tr>})}</tbody></table></div>
}
