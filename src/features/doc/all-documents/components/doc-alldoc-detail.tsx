import type { MockDocument, FormValues, SignatureStage } from '../../document-types'
import { FaPenNib } from 'react-icons/fa6'

type Props = {
  document: MockDocument
  detailValues: FormValues
  kindTitle: string
  statusLabel: string
  dateText: (value: string) => string
  canSignAsSubmitter: boolean
  canReview: boolean
  mockRole: 'พนักงาน' | 'ผู้จัดการแผนก' | 'HR'
  onClose: () => void
  onSign: () => void
  onReject: () => void
  onCancel: () => void
}
function DetailField({ label, value, full = false }: { label: string; value?: string | number; full?: boolean }) {
  if (value === undefined || value === '') return null
  return <div className={`dms-form-field documents-readonly-field${full ? ' dms-form-field--full' : ''}`}><span className="dms-form-label">{label}</span><div className="documents-readonly-value">{value}</div></div>
}

export default function DocAllDocumentsDetail({ document: doc, detailValues, kindTitle, statusLabel, dateText, canSignAsSubmitter, canReview, mockRole, onClose, onSign, onReject, onCancel }: Props) {
  const canApprove = doc.status === 'pending_mgr' && mockRole === 'ผู้จัดการแผนก' && doc.department === 'การตลาด' || doc.status === 'pending_hr' && canReview && doc.employee !== 'ศิริพร แก้วมณี'
  const leaveNames: Record<string, string> = { personal:'ลากิจ', sick:'ลาป่วย', vacation:'ลาพักร้อน', emergency:'ลาพักร้อนฉุกเฉิน', unpaid:'ลากิจไม่รับค่าจ้าง', maternity:'ลาคลอด', ordain:'ลาบวช', marriage:'ลาสมรส', other:'ลาอื่น ๆ' }
  const statusStyle = doc.status === 'approved' ? 'is-done' : doc.status === 'rejected' ? 'is-cancelled' : 'is-submitted'
  return <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="dms-modal dms-create-doc-modal documents-detail-modal" role="dialog" aria-modal="true" aria-labelledby="document-detail-title">
    <h2 className="dms-modal-title">รายละเอียดเอกสาร</h2><p className="dms-modal-subtitle">{doc.no} · ยื่นเมื่อ {dateText(doc.date)}</p><button className="modal-close" aria-label="ปิด" onClick={onClose}>×</button>
    <div className="dms-create-doc-body documents-detail-body">
      <div className="documents-detail-header"><div><span className={`dms-card-status ${statusStyle}`}>{statusLabel}</span><h2 id="document-detail-title">{doc.title}</h2></div></div>
      <section className="dms-pm-create-section documents-detail-section"><h3>ข้อมูลผู้ยื่น</h3><div className="dms-pm-create-grid"><DetailField label="ชื่อ - นามสกุล" value={doc.employee} /><DetailField label="แผนก" value={doc.department} /><DetailField label="ประเภทเอกสาร" value={kindTitle} /><DetailField label="วันที่ยื่น" value={dateText(doc.date)} /><DetailField label="เลขที่เอกสาร" value={doc.no} /><DetailField label="สถานะ" value={statusLabel} /></div></section>
      <section className="dms-pm-create-section documents-detail-section"><h3>รายละเอียดคำขอ</h3><div className="dms-pm-create-grid">
        {doc.kind === 'leave' && <><DetailField label="ประเภทการลา" value={leaveNames[String(detailValues.leaveType ?? doc.leaveType ?? '')] ?? String(detailValues.leaveType ?? doc.leaveType ?? '')} /><DetailField label="วันที่ลา" value={doc.from ? dateText(doc.from) : ''} /><DetailField label="ถึงวันที่" value={doc.to ? dateText(doc.to) : ''} /><DetailField label="จำนวนวัน" value={doc.days ? `${doc.days} วัน` : ''} /><DetailField label="เวลาเริ่มลา" value={String(detailValues.start ?? '')} /><DetailField label="เวลาสิ้นสุดลา" value={String(detailValues.end ?? '')} /><DetailField label="รวมชั่วโมง" value={String(detailValues.hours ?? '')} /><DetailField label="เหตุผลการลา" value={doc.reason ?? doc.summary} full /><DetailField label="ใบรับรองแพทย์" value={detailValues.cert === true ? 'แนบแล้ว' : detailValues.leaveType === 'sick' ? 'ยังไม่ได้แนบ' : ''} /><DetailField label="ลาเป็นชั่วโมง" value={detailValues.byHour === true ? 'ใช่' : ''} /></>}
        {doc.kind === 'ot' && <><DetailField label="ประเภทวัน" value={{weekday:'วันทำงานปกติ',weekend:'วันหยุดประจำสัปดาห์',holiday:'วันหยุดนักขัตฤกษ์'}[String(detailValues.dayType)] ?? ''} /><DetailField label="วันที่ทำ OT" value={detailValues.date ? dateText(String(detailValues.date)) : doc.from ? dateText(doc.from) : ''} /><DetailField label="เวลาเริ่ม" value={String(detailValues.start ?? '')} /><DetailField label="เวลาสิ้นสุด" value={String(detailValues.end ?? '')} /><DetailField label="ชั่วโมงรวม" value={detailValues.hours ? `${detailValues.hours} ชั่วโมง` : ''} /><DetailField label="งาน / โครงการที่ทำ" value={String(detailValues.task ?? doc.summary)} full /><DetailField label="เหตุผลที่ต้องทำ OT" value={String(detailValues.reason ?? doc.reason ?? '')} full /></>}
        {doc.kind === 'timefix' && <><DetailField label="วันที่ต้องการแก้ไข" value={detailValues.date ? dateText(String(detailValues.date)) : doc.from ? dateText(doc.from) : ''} /><DetailField label="สาเหตุ" value={{forgot:'ลืมสแกนนิ้ว',device:'เครื่องสแกนขัดข้อง',offsite:'ปฏิบัติงานนอกสถานที่',other:'อื่น ๆ'}[String(detailValues.cause)] ?? ''} /><DetailField label="เวลาเข้างานที่ถูกต้อง" value={String(detailValues.inTime ?? '')} /><DetailField label="เวลาออกงานที่ถูกต้อง" value={String(detailValues.outTime ?? '')} /><DetailField label="รายละเอียด" value={String(detailValues.reason ?? doc.summary)} full /></>}
        {doc.kind === 'wfh' && <><DetailField label="ตั้งแต่วันที่" value={doc.from ? dateText(doc.from) : ''} /><DetailField label="ถึงวันที่" value={doc.to ? dateText(doc.to) : ''} /><DetailField label="จำนวนวัน" value={doc.days ? `${doc.days} วัน` : ''} /><DetailField label="สถานที่ทำงาน" value={String(detailValues.place ?? '')} /><DetailField label="แผนงานที่จะทำ" value={String(detailValues.plan ?? doc.summary)} full /></>}
        {doc.kind === 'outing' && <><DetailField label="วันที่" value={detailValues.date ? dateText(String(detailValues.date)) : doc.from ? dateText(doc.from) : ''} /><DetailField label="เวลาออก" value={String(detailValues.outTime ?? '')} /><DetailField label="เวลากลับโดยประมาณ" value={String(detailValues.backTime ?? '')} /><DetailField label="สถานที่ที่ไป" value={String(detailValues.place ?? '')} /><DetailField label="วัตถุประสงค์" value={String(detailValues.reason ?? doc.summary)} full /></>}
        {doc.kind === 'swap' && <><DetailField label="วันที่ขอหยุด" value={detailValues.offDate ? dateText(String(detailValues.offDate)) : doc.from ? dateText(doc.from) : ''} /><DetailField label="วันที่มาทำงานแทน" value={detailValues.workDate ? dateText(String(detailValues.workDate)) : doc.to ? dateText(doc.to) : ''} /><DetailField label="เหตุผล" value={String(detailValues.reason ?? doc.reason ?? doc.summary)} full /></>}
      </div></section>
      <section className="dms-pm-create-section documents-detail-section"><h3>ขั้นตอนการพิจารณา</h3><div className="documents-workflow-steps">{(['ผู้ยื่น','ผู้จัดการแผนก','HR'] as SignatureStage[]).map((stage) => { const sig=doc.signatures?.[stage]; const rejected=doc.status==='rejected'&&(doc.rejectedBy==='manager'&&stage==='ผู้จัดการแผนก'||doc.rejectedBy==='hr'&&stage==='HR'); const current=doc.status==='pending_mgr'&&stage==='ผู้จัดการแผนก'||doc.status==='pending_hr'&&stage==='HR'; const done=stage==='ผู้ยื่น'||Boolean(sig)||doc.status==='approved'; return <div className={`documents-workflow-step ${rejected?'is-rejected':done?'is-done':current?'is-current':''}`} key={stage}><span>{rejected?'!':done?'✓':'•'}</span><div><b>{stage}</b><small>{sig?`${sig.name} · ${dateText(sig.date)}`:rejected?'ไม่อนุมัติ':current?'รอพิจารณา':stage==='ผู้ยื่น'?`ยื่นเมื่อ ${dateText(doc.date)}`:'รอดำเนินการ'}</small></div></div> })}</div>{doc.note&&<p className="documents-review-note">หมายเหตุจากผู้พิจารณา: {doc.note}</p>}</section>
      <section className="dms-pm-create-section documents-detail-section"><h3>ลายเซ็น</h3><div className="documents-signature-list">{(['ผู้ยื่น','ผู้จัดการแผนก','HR'] as SignatureStage[]).map((stage) => {const sig=doc.signatures?.[stage];return <div className="documents-signature-card" key={stage}><div className="documents-signature-image">{sig?<img src={sig.image} alt={`ลายเซ็น${stage}`}/>:<span>ยังไม่มีลายเซ็น</span>}</div><b>{stage}</b>{sig&&<small>{sig.name} · {dateText(sig.date)}</small>}</div>})}</div></section>
      {(canSignAsSubmitter||canApprove)&&<div className="documents-detail-actions">{canSignAsSubmitter&&<button className="dms-create-btn" onClick={onSign}><FaPenNib /> เซ็นชื่อผู้ยื่น</button>}{doc.status.startsWith('pending')&&canApprove&&<><button className="dms-create-btn" onClick={onSign}><FaPenNib /> เซ็นอนุมัติ</button><button className="documents-reject" onClick={onReject}>ไม่อนุมัติ</button></>}</div>}
      {doc.status==='pending_mgr'&&mockRole==='พนักงาน'&&doc.employee==='สมชาย ใจดี'&&<button className="dms-back-btn" onClick={onCancel}>ยกเลิกเอกสาร</button>}
    </div>
  </section></div>
}
