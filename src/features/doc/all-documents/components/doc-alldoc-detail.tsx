import type { MockDocument, FormValues, SignatureStage } from '../../document-types'
import { medicalCertificateUrl } from '../../services/employee-requests.service'
import { FaPenNib } from 'react-icons/fa6'

type Props = {
  document: MockDocument
  detailValues: FormValues
  kindTitle: string
  statusLabel: string
  dateText: (value: string) => string
  canApprove: boolean
  canCancel: boolean
  canViewMedicalCertificate: boolean
  onClose: () => void
  onSign: () => void
  onReject: () => void
  onCancel: () => void
  copy: any
}
function DetailField({ label, value, full = false }: { label: string; value?: string | number; full?: boolean }) {
  if (value === undefined || value === '') return null
  return <div className={`dms-form-field documents-readonly-field${full ? ' dms-form-field--full' : ''}`}><span className="dms-form-label">{label}</span><div className="documents-readonly-value">{value}</div></div>
}

// flow ที่เก็บไว้กับเอกสารตอนยื่น (snapshot) — ไม่มี = เอกสารเก่าก่อนมีระบบกฎ flow
type FlowKey = 'manager' | 'executive' | 'hr'
type FlowSnap = { stages: FlowKey[]; recordAfterStage: string | null } | null
const STAGE_OF: Record<FlowKey, SignatureStage> = { manager: 'ผู้จัดการแผนก', executive: 'ผู้ประกอบการ', hr: 'HR' }
const ALL_STAGES = ['ผู้ยื่น', 'ผู้จัดการแผนก', 'ผู้ประกอบการ', 'HR'] as SignatureStage[]

export default function DocAllDocumentsDetail({ document: doc, detailValues, kindTitle, statusLabel, dateText, canApprove, canCancel, canViewMedicalCertificate, onClose, onSign, onReject, onCancel, copy: c }: Props) {
  const leaveNames: Record<string, string> = c.leaveTypes
  const statusStyle = doc.status === 'approved' ? 'is-done' : doc.status === 'rejected' ? 'is-cancelled' : 'is-submitted'
  const outingAddress = [detailValues.address, detailValues.subdistrict, detailValues.district, detailValues.province, detailValues.postalCode, detailValues.country].map((value) => String(value ?? '').trim()).filter(Boolean).join(' ')
  const outingCoordinates = [detailValues.latitude, detailValues.longitude].every((value) => value !== undefined && value !== '') ? `${detailValues.latitude}, ${detailValues.longitude}` : ''

  // ขั้นตอนที่แสดง:
  //  - เอกสารใหม่ (มี flow snapshot): แสดงตาม flow ที่ใช้ตอนยื่น เช่น ผู้ยื่น → HR (ตัดขั้นหลังจุดบันทึกออก เพราะไม่ถูกใช้)
  //  - เอกสารเก่า (ไม่มี snapshot): แสดงแบบเดิมทุกประการ
  const flow = (doc as MockDocument & { flow?: FlowSnap }).flow ?? null
  const workflowStages: SignatureStage[] = (() => {
    if (flow && Array.isArray(flow.stages) && flow.stages.length > 0) {
      const cut = flow.recordAfterStage ? flow.stages.indexOf(flow.recordAfterStage as FlowKey) : -1
      const used = cut >= 0 ? flow.stages.slice(0, cut + 1) : flow.stages
      return ['ผู้ยื่น', ...used.map((key) => STAGE_OF[key])] as SignatureStage[]
    }
    const isManagerFlow = Boolean(doc.signatures?.['ผู้จัดการแผนก']) || doc.status === 'pending_mgr' || doc.rejectedBy === 'manager'
    return ALL_STAGES.filter((stage) => {
      const hasSig = Boolean(doc.signatures?.[stage])
      if (stage === 'ผู้จัดการแผนก') return isManagerFlow || hasSig
      if (stage === 'ผู้ประกอบการ') return !isManagerFlow || hasSig
      return true
    })
  })()

  return <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="dms-modal dms-create-doc-modal documents-detail-modal" role="dialog" aria-modal="true" aria-labelledby="document-detail-title">
    <h2 className="dms-modal-title">{c.detail.title}</h2><p className="dms-modal-subtitle">{doc.no} · {c.detail.submittedAt} {dateText(doc.date)}</p><button type="button" className="modal-close documents-detail-close" aria-label={c.detail.close} onClick={(event) => { event.stopPropagation(); onClose() }}>×</button>
    <div className="dms-create-doc-body documents-detail-body">
      <div className="documents-detail-header"><div><span className={`dms-card-status ${statusStyle}`}>{statusLabel}</span><h2 id="document-detail-title">{doc.title}</h2></div></div>
      <section className="dms-pm-create-section documents-detail-section"><h3>{c.detail.submitterInfo}</h3><div className="dms-pm-create-grid"><DetailField label={c.detail.fullName} value={doc.employee} /><DetailField label={c.detail.department} value={doc.department} /><DetailField label={c.detail.kind} value={kindTitle} /><DetailField label={c.detail.date} value={dateText(doc.date)} /><DetailField label={c.detail.number} value={doc.no} /><DetailField label={c.detail.status} value={statusLabel} /></div></section>
      <section className="dms-pm-create-section documents-detail-section"><h3>{c.detail.request}</h3><div className="dms-pm-create-grid">
        {doc.kind === 'leave' && <>
          <DetailField label={c.fieldLabels.leaveType} value={leaveNames[String(detailValues.leaveType ?? doc.leaveType ?? '')] ?? String(detailValues.leaveType ?? doc.leaveType ?? '')} />
          <DetailField label={c.fieldLabels.from} value={doc.from ? dateText(doc.from) : ''} />
          <DetailField label={c.fieldLabels.to} value={doc.to ? dateText(doc.to) : ''} />
          <DetailField label={c.fieldLabels.days} value={doc.days ? `${doc.days} ${c.ledger.day}` : ''} />
          <DetailField label={c.fieldLabels.start} value={String(detailValues.start ?? '')} />
          <DetailField label={c.fieldLabels.end} value={String(detailValues.end ?? '')} />
          <DetailField label={c.fieldLabels.hours} value={String(detailValues.hours ?? '')} />
          <DetailField label={c.fieldLabels.reason} value={doc.reason ?? ''} full />
          {detailValues.leaveType === 'sick' && canViewMedicalCertificate && <>
            <DetailField
              label={c.fieldLabels.cert}
              value={doc.medicalCertificateAvailable ? c.ledger.certificateAttached : c.ledger.certificateMissing}
            />
            {doc.medicalCertificateAvailable && canViewMedicalCertificate && (
              <div className="dms-form-field">
                <span className="dms-form-label">{c.fieldLabels.cert}</span>
                <a className="dms-back-btn" download href={medicalCertificateUrl(doc.id)}>
                  {c.messages.downloadCertificate}
                </a>
              </div>
            )}
          </>}
          <DetailField label={c.fieldLabels.byHour} value={detailValues.byHour === true ? (c.leaveTypes.sick === 'Sick leave' ? 'Yes' : 'ใช่') : ''} />
        </>}
        {doc.kind === 'ot' && <><DetailField label={c.fieldLabels.dayType} value={c.fieldOptions[String(detailValues.dayType)] ?? ''} /><DetailField label={c.fieldLabels.date} value={detailValues.date ? dateText(String(detailValues.date)) : doc.from ? dateText(doc.from) : ''} /><DetailField label={c.fieldLabels.start} value={String(detailValues.start ?? '')} /><DetailField label={c.fieldLabels.end} value={String(detailValues.end ?? '')} /><DetailField label={c.fieldLabels.hours} value={detailValues.hours ? `${detailValues.hours} ${c.ledger.hour}` : ''} /><DetailField label={c.fieldLabels.task} value={String(detailValues.task ?? '')} full /><DetailField label={c.fieldLabels.reason} value={String(detailValues.reason ?? doc.reason ?? '')} full /></>}
        {doc.kind === 'timefix' && <><DetailField label={c.fieldLabels.date} value={detailValues.date ? dateText(String(detailValues.date)) : doc.from ? dateText(doc.from) : ''} /><DetailField label={c.fieldLabels.cause} value={c.fieldOptions[String(detailValues.cause)] ?? ''} /><DetailField label={c.fieldLabels.inTime} value={String(detailValues.inTime ?? '')} /><DetailField label={c.fieldLabels.outTime} value={String(detailValues.outTime ?? '')} /><DetailField label={c.fieldLabels.reason} value={String(detailValues.reason ?? doc.reason ?? '')} full /></>}
        {doc.kind === 'wfh' && <><DetailField label={c.fieldLabels.from} value={doc.from ? dateText(doc.from) : ''} /><DetailField label={c.fieldLabels.to} value={doc.to ? dateText(doc.to) : ''} /><DetailField label={c.fieldLabels.days} value={doc.days ? `${doc.days} ${c.ledger.day}` : ''} /><DetailField label={c.fieldLabels.place} value={String(detailValues.place ?? '')} /><DetailField label={c.fieldLabels.plan} value={String(detailValues.plan ?? '')} full /></>}
        {doc.kind === 'outing' && <><DetailField label={c.fieldLabels.from} value={doc.from ? dateText(doc.from) : ''} /><DetailField label={c.fieldLabels.to} value={doc.to ? dateText(doc.to) : ''} /><DetailField label={c.fieldLabels.outTime} value={String(detailValues.outTime ?? '')} /><DetailField label={c.fieldLabels.backTime} value={String(detailValues.backTime ?? '')} /><DetailField label={c.fieldLabels.company} value={String(detailValues.company ?? '')} /><DetailField label={c.fieldLabels.address} value={outingAddress || String(detailValues.place ?? '')} full /><DetailField label={c.fieldLabels.coordinates} value={outingCoordinates} /><DetailField label={c.fieldLabels.project} value={String(detailValues.project ?? '')} /><DetailField label={c.fieldLabels.customerName} value={String(detailValues.customerName ?? '')} /><DetailField label={c.fieldLabels.customerPosition} value={String(detailValues.customerPosition ?? '')} /><DetailField label={c.fieldLabels.phone} value={String(detailValues.phone ?? '')} /><DetailField label={c.fieldLabels.workDetails} value={String(detailValues.workDetails || detailValues.reason || doc.reason || '')} full /><DetailField label={c.fieldLabels.remark} value={String(detailValues.remark ?? '')} full /></>}
      </div></section>
      <section className="dms-pm-create-section documents-detail-section"><h3>{c.detail.workflow}</h3><div className="documents-workflow-steps">{workflowStages.map((stage) => {
        const sig = doc.signatures?.[stage]
        const rejected = doc.status === 'rejected' && (doc.rejectedBy === 'manager' && stage === 'ผู้จัดการแผนก' || doc.rejectedBy === 'executive' && stage === 'ผู้ประกอบการ' || doc.rejectedBy === 'hr' && stage === 'HR')
        const current = doc.status === 'pending_mgr' && stage === 'ผู้จัดการแผนก' || doc.status === 'pending_exec' && stage === 'ผู้ประกอบการ' || doc.status === 'pending_hr' && stage === 'HR'
        const done = stage === 'ผู้ยื่น' || Boolean(sig) || doc.status === 'approved'
        const stageLabel = stage === 'ผู้ยื่น' ? c.detail.submitted : stage === 'ผู้ประกอบการ' ? c.detail.executive : stage === 'HR' ? c.detail.hr : c.detail.manager
        return <div className={`documents-workflow-step ${rejected ? 'is-rejected' : done ? 'is-done' : current ? 'is-current' : ''}`} key={stage}><span>{rejected ? '!' : done ? '✓' : '•'}</span><div><b>{stageLabel}</b><small>{sig ? `${sig.name} · ${dateText(sig.date)}` : rejected ? c.detail.rejected : current ? c.detail.waiting : stage === 'ผู้ยื่น' ? `${c.detail.submittedAt} ${dateText(doc.date)}` : c.detail.notStarted}</small></div></div>
      })}</div>{doc.note&&<p className="documents-review-note">{c.detail.rejectionNote}: {doc.note}</p>}</section>
      <section className="dms-pm-create-section documents-detail-section"><h3>{c.detail.signature}</h3><div className="documents-signature-list">{(['ผู้ยื่น','ผู้จัดการแผนก','ผู้ประกอบการ','HR'] as SignatureStage[]).filter((stage) => doc.signatures?.[stage]).map((stage) => {const sig=doc.signatures?.[stage];const stageLabel=stage==='ผู้ยื่น'?c.detail.submitted:stage==='ผู้ประกอบการ'?c.detail.executive:stage==='HR'?c.detail.hr:c.detail.manager;return <div className="documents-signature-card" key={stage}>{sig!.image?<div className="documents-signature-image"><img src={sig!.image} alt={`${c.detail.signature}: ${stageLabel}`}/></div>:<div className="documents-signature-image documents-signature-image--empty">{c.detail.confirmedNoSign ?? 'ยืนยันโดยไม่เซ็น'}</div>}<b>{stageLabel}</b><small>{sig!.name} · {dateText(sig!.date)}</small></div>})}</div></section>
      {canApprove&&<div className="documents-detail-actions"><button className="dms-create-btn" onClick={onSign}><FaPenNib /> {c.detail.signApproval}</button><button className="documents-reject" onClick={onReject}>{c.detail.reject}</button></div>}
      {canCancel&&<button className="dms-back-btn" onClick={onCancel}>{c.detail.cancel}</button>}
    </div>
  </section></div>
}