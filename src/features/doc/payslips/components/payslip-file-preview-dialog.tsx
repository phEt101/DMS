import { useEffect } from 'react'
import { FaXmark } from 'react-icons/fa6'

export default function PayslipFilePreviewDialog({ url, fileName, closeLabel, onClose }: {
  url: string
  fileName: string
  closeLabel: string
  onClose: () => void
}) {
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(fileName)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="payslips-preview-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="payslips-preview-dialog" role="dialog" aria-modal="true" aria-label={fileName}>
        <header>
          <strong title={fileName}>{fileName}</strong>
          <button type="button" className="modal-close" aria-label={closeLabel} onClick={onClose}><FaXmark /></button>
        </header>
        <div className={`payslips-preview-content${isImage ? ' is-image' : ''}`}>
          {isImage
            ? <img src={url} alt={fileName} />
            : <iframe src={url} title={fileName} />}
        </div>
      </section>
    </div>
  )
}
