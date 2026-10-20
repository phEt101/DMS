import { useEffect, useRef, useState } from 'react'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  submitting?: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  copy: any
}

export default function DocRejectModal({ open, title, subtitle, submitting = false, onClose, onConfirm, copy: c }: Props) {
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setNote('')
    setTouched(false)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  if (!open) return null
  const trimmed = note.trim()
  const invalid = touched && !trimmed

  const submit = () => {
    setTouched(true)
    if (!trimmed || submitting) return
    onConfirm(trimmed)
  }

  return (
    <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose() }}>
      <section className="documents-modal documents-reject-modal" role="dialog" aria-modal="true" aria-labelledby="reject-modal-title">
        <div className="documents-modal-head">
          <div>
            <h2 id="reject-modal-title">{c.reject?.title ?? 'ไม่อนุมัติเอกสาร'}</h2>
            <p>{title}{subtitle ? ` · ${subtitle}` : ''}</p>
          </div>
          <button type="button" aria-label={c.detail.close} onClick={onClose} disabled={submitting}>×</button>
        </div>

        <label className="dms-form-field dms-form-field--full">
          <span className="dms-form-label">{c.reject?.reasonLabel ?? 'เหตุผลที่ไม่อนุมัติ'} *</span>
          <textarea
            ref={inputRef}
            rows={4}
            value={note}
            maxLength={500}
            placeholder={c.reject?.placeholder ?? 'ระบุเหตุผลเพื่อให้ผู้ยื่นทราบ'}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={invalid}
          />
          {invalid && <small role="alert" style={{ color: '#b91c1c' }}>{c.reject?.required ?? 'กรุณากรอกเหตุผล'}</small>}
        </label>

        <div className="documents-signature-actions">
          <button type="button" onClick={onClose} disabled={submitting}>{c.reject?.cancel ?? 'ยกเลิก'}</button>
          <button type="button" className="documents-reject" onClick={submit} disabled={submitting}>
            {c.reject?.confirm ?? 'ยืนยันไม่อนุมัติ'}
          </button>
        </div>
      </section>
    </div>
  )
}