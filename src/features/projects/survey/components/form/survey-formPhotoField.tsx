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
  translations,
}: {
  label: string
  help?: string
  className?: string
  value?: unknown
  alt: string
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  translations?: any
}) {
  const t = translations?.features?.survey ?? {}
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <label className={className}>
      <span className="dms-form-label">{label}</span>
      {help ? <small className="dms-form-help">{help}</small> : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Hide the camera-open action: mobile browsers often surface a "Take photo" option when using the camera button.
            The browser's file picker controls whether a camera option appears for an <input type="file">; that cannot be fully suppressed
            on all mobile browsers. Removing the explicit "Open camera" button prevents the app from invoking a direct camera flow.
            Users can still use the device's file picker via the "Choose file" button. */}
        <input ref={inputRef} style={{ display: 'none' }} type="file" accept="image/*" onChange={onFile} />
        <button type="button" className="dms-create-btn" onClick={() => inputRef.current?.click()}>{t.form?.actions?.chooseFile ?? 'Choose file'}</button>
        {value ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <img src={String(value)} alt={alt} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
            <button type="button" className="dms-back-btn" onClick={onRemove}>{t.form?.actions?.remove ?? 'Remove'}</button>
          </div>
        ) : null}
      </div>
    </label>
  )
}
