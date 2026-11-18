import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  documentTitle: string
  documentNo: string
  initialFrom: string
  initialTo: string
  submitting: boolean
  onClose: () => void
  onConfirm: (data: { from: string; to: string; note: string }) => void
  copy: any
}

// โมดัลแก้ไขวันลา (เฉพาะ HR) — เช่น พนักงานยื่นพักร้อนไว้แล้วแต่มีธุระวันนั้น ให้ HR เลื่อนเป็นวันใหม่ได้
export default function DocLeaveDatesEditModal({ open, documentTitle, documentNo, initialFrom, initialTo, submitting, onClose, onConfirm, copy: c }: Props) {
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open) { setFrom(initialFrom); setTo(initialTo); setNote('') }
  }, [open, initialFrom, initialTo])
  if (!open) return null
  const valid = Boolean(from && to && to >= from)
  return <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose() }}>
    <section className="dms-modal dms-create-doc-modal documents-detail-modal documents-leave-edit-modal" role="dialog" aria-modal="true" aria-labelledby="leave-edit-title">
      <h2 className="dms-modal-title" id="leave-edit-title">{c.detail.editLeaveDates.title}</h2>
      <p className="dms-modal-subtitle">{documentNo} · {documentTitle}</p>
      <button type="button" className="modal-close documents-detail-close" aria-label={c.detail.close} onClick={onClose} disabled={submitting}>×</button>
      <div className="dms-create-doc-body documents-detail-body">
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">{c.fieldLabels.from}</span>
            <input className="dms-form-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">{c.fieldLabels.to}</span>
            <input className="dms-form-input" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        <label className="dms-form-field dms-form-field--full">
          <span className="dms-form-label">{c.detail.editLeaveDates.note}</span>
          <input className="dms-form-input" value={note} maxLength={500} placeholder={c.detail.editLeaveDates.notePlaceholder} onChange={(event) => setNote(event.target.value)} />
        </label>
        <p className="documents-edit-leave-help">{c.detail.editLeaveDates.help}</p>
        <div className="documents-detail-actions">
          <button type="button" className="dms-create-btn" disabled={!valid || submitting} onClick={() => onConfirm({ from, to, note })}>
            {submitting ? c.detail.editLeaveDates.saving : c.detail.editLeaveDates.save}
          </button>
          <button type="button" className="dms-back-btn" onClick={onClose} disabled={submitting}>{c.messages.cancel}</button>
        </div>
      </div>
    </section>
  </div>
}
