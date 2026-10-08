import { useRef } from 'react'

export default function PhotoField({
  label,
  help,
  className = 'dms-form-field',
  value,
  alt,
  onFile,
  onOpenCamera,
  onRemove,
}: {
  label: string
  help?: string
  className?: string
  value?: unknown
  alt: string
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  onOpenCamera: () => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <label className={className}>
      <span className="dms-form-label">{label}</span>
      {help ? <small className="dms-form-help">{help}</small> : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input ref={inputRef} style={{ display: 'none' }} type="file" accept="image/*" onChange={onFile} />
        <button type="button" className="dms-create-btn" onClick={onOpenCamera}>เปิดกล้อง</button>
        <button type="button" className="dms-create-btn" onClick={() => inputRef.current?.click()}>เลือกรูป</button>
        {value ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <img src={String(value)} alt={alt} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
            <button type="button" className="dms-back-btn" onClick={onRemove}>ลบรูป</button>
          </div>
        ) : null}
      </div>
    </label>
  )
}
