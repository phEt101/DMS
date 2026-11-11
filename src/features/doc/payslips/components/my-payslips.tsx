import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaDownload, FaEye, FaFileLines, FaLock } from 'react-icons/fa6'
import { useToast } from '../../../../components/toast-provider'
import { PaginationFooter } from '../../../../components/pagination-footer'
import { listMyPayslips, payslipFileUrl, payslipPreviewUrl, type MyPayslip } from '../services/payslips.service'
import PayslipFilePreviewDialog from './payslip-file-preview-dialog'
import { canPreviewPayslip, formatFileSize, type PayslipsSharedProps } from './payslips.utils'

export default function MyPayslips({ copy, paginationLabels, locale, periodLabel, errorText }: PayslipsSharedProps) {
  const { showToast } = useToast()
  const [items, setItems] = useState<MyPayslip[] | null>(null)
  const [year, setYear] = useState<number | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [previewItem, setPreviewItem] = useState<MyPayslip | null>(null)

  const load = useCallback(() => {
    listMyPayslips().then(setItems).catch((error) => { setItems([]); showToast(errorText(error), 'error') })
  }, [errorText, showToast])
  useEffect(() => { load() }, [load])

  const years = useMemo(() => Array.from(new Set((items ?? []).map((item) => item.year))).sort((a, b) => b - a), [items])
  const visible = (items ?? []).filter((item) => year === 'all' || item.year === year)
  const totalPages = Math.max(Math.ceil(visible.length / pageSize), 1)
  const pageSafe = Math.max(1, Math.min(page, totalPages))
  const pagedItems = visible.slice((pageSafe - 1) * pageSize, pageSafe * pageSize)
  const yearLabel = (value: number) => new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(value, 0, 1))

  return (
    <>
      <div className="documents-tools">
        <select value={year} onChange={(event) => {
          setYear(event.target.value === 'all' ? 'all' : Number(event.target.value))
          setPage(1)
        }} aria-label={copy.year}>
          <option value="all">{copy.allYears}</option>
          {years.map((value) => <option key={value} value={value}>{yearLabel(value)}</option>)}
        </select>
        <span className="payslips-confidential"><FaLock /> {copy.confidential}</span>
      </div>

      {items !== null && visible.length === 0 && (
        <div className="payslips-empty">
          <FaFileLines aria-hidden="true" />
          <strong>{copy.mineEmptyTitle}</strong>
          <span>{copy.mineEmptyBody}</span>
        </div>
      )}

      <div className="payslips-grid">
        {pagedItems.map((item) => (
          <article key={item.id} className={`payslip-card${item.viewedAt ? '' : ' is-new'}`}>
            <div className="payslip-card-icon"><FaFileLines aria-hidden="true" /></div>
            <div className="payslip-card-body">
              <strong>{periodLabel(item.year, item.month)}</strong>
              <small>{formatFileSize(item.fileSize)}</small>
              {item.note && <p>{copy.note}: {item.note}</p>}
            </div>
            {!item.viewedAt && <span className="documents-pill is-pending">{copy.new}</span>}
            <div className="payslip-card-actions">
              {canPreviewPayslip(item.fileName) && (
                <button type="button" className="payslip-action" onClick={() => setPreviewItem(item)}>
                  <FaEye /> {copy.preview}
                </button>
              )}
              <a className="payslip-action" href={payslipFileUrl(item.id, true)}><FaDownload /> {copy.download}</a>
            </div>
          </article>
        ))}
      </div>
      {visible.length > 0 && <PaginationFooter
        page={pageSafe}
        pageSize={pageSize}
        total={visible.length}
        labels={paginationLabels}
        onPageChange={(nextPage) => setPage(Math.max(1, Math.min(nextPage, totalPages)))}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />}
      {previewItem && <PayslipFilePreviewDialog
        url={payslipPreviewUrl(previewItem.id)}
        fileName={previewItem.fileName}
        closeLabel={copy.close}
        onClose={() => setPreviewItem(null)}
      />}
    </>
  )
}
