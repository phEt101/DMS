import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { FaDownload, FaEye, FaFileLines, FaFilter, FaLock, FaMagnifyingGlass, FaTrash, FaUpload, FaUser, FaXmark } from 'react-icons/fa6'
import ConfirmDialog from '../../../components/confirm-dialog'
import { useToast } from '../../../components/toast-provider'
import type { Language, Translations } from '../../../locales'
import { translateServerErrorMessage } from '../../../services/api'
import { useAuth } from '../../auth/hooks/use-auth'
import { avatarSrc } from '../../../services/avatar'
import {
  bulkUploadPayslips, deletePayslip, listManagedPayslips, listMyPayslips, payslipFileUrl, payslipPreviewUrl, uploadPayslip,
  type BulkResult, type ManagedPayslipRow, type MyPayslip,
} from './payslips.service'
import './payslips.css'

type Tab = 'mine' | 'manage'
type Filter = 'all' | 'pending' | 'sent' | 'viewed'

const MAX_BYTES = 5 * 1024 * 1024
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function PayslipsPage({ translations, language }: { translations: Translations; language: Language }) {
  const copy = (translations.features as any).payslips as Record<string, string>
  const { user } = useAuth()
  const { showToast } = useToast()
  const locale = language === 'th' ? 'th-TH' : 'en-US'
  const canManage = Boolean(user && (
    user.role.name.trim().toLowerCase() === 'admin' || String(user.department ?? '').trim().toLowerCase() === 'hr div.'
  ))
  const [tab, setTab] = useState<Tab>('mine')

  const periodLabel = useCallback(
    (year: number, month: number) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)),
    [locale],
  )
  const errorText = (error: unknown) => translateServerErrorMessage(error, language) || copy.loadError

  return (
    <section className="feature-page feature-page--wide documents-page payslips-page">
      <p className="feature-kicker">{translations.sidebar.items.documents}</p>
      <div className="documents-heading">
        <div>
          <h1>{copy.title}</h1>
          <span>{copy.subtitle}</span>
        </div>
      </div>

      {canManage && (
        <div className="documents-notification-tabs payslips-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'mine'} aria-pressed={tab === 'mine'} onClick={() => setTab('mine')}>{copy.tabMine}</button>
          <button type="button" role="tab" aria-selected={tab === 'manage'} aria-pressed={tab === 'manage'} onClick={() => setTab('manage')}>{copy.tabManage}</button>
        </div>
      )}

      {tab === 'mine' || !canManage
        ? <MyPayslips copy={copy} locale={locale} periodLabel={periodLabel} errorText={errorText} />
        : <ManagePayslips copy={copy} language={language} periodLabel={periodLabel} errorText={errorText} showToast={showToast} />}
    </section>
  )
}

type SharedProps = {
  copy: Record<string, string>
  periodLabel: (year: number, month: number) => string
  errorText: (error: unknown) => string
}

function MyPayslips({ copy, locale, periodLabel, errorText }: SharedProps & { locale: string }) {
  const { showToast } = useToast()
  const [items, setItems] = useState<MyPayslip[] | null>(null)
  const [year, setYear] = useState<number | 'all'>('all')
  const [previewItem, setPreviewItem] = useState<{ id: number; fileName: string } | null>(null)

  const load = useCallback(() => {
    listMyPayslips().then(setItems).catch((error) => { setItems([]); showToast(errorText(error), 'error') })
  }, [errorText, showToast])
  useEffect(() => { load() }, [load])

  const years = useMemo(() => Array.from(new Set((items ?? []).map((item) => item.year))).sort((a, b) => b - a), [items])
  const visible = (items ?? []).filter((item) => year === 'all' || item.year === year)
  const yearLabel = (value: number) => new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(value, 0, 1))

  return (
    <>
      <div className="documents-tools">
        <select value={year} onChange={(event) => setYear(event.target.value === 'all' ? 'all' : Number(event.target.value))} aria-label={copy.year}>
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
        {visible.map((item) => (
          <article key={item.id} className={`payslip-card${item.viewedAt ? '' : ' is-new'}`}>
            <div className="payslip-card-icon"><FaFileLines aria-hidden="true" /></div>
            <div className="payslip-card-body">
              <strong>{periodLabel(item.year, item.month)}</strong>
              <small>{formatSize(item.fileSize)}</small>
              {item.note && <p>{copy.note}: {item.note}</p>}
            </div>
            {!item.viewedAt && <span className="documents-pill is-pending">{copy.new}</span>}
            <div className="payslip-card-actions">
              {canPreviewFile(item.fileName) && (
                <button type="button" className="payslip-action" onClick={() => setPreviewItem(item)}>
                  <FaEye /> {copy.preview}
                </button>
              )}
              <a className="payslip-action" href={payslipFileUrl(item.id, true)}><FaDownload /> {copy.download}</a>
            </div>
          </article>
        ))}
      </div>
      {previewItem && <FilePreviewDialog
        url={payslipPreviewUrl(previewItem.id)}
        fileName={previewItem.fileName}
        closeLabel={copy.close}
        onClose={() => setPreviewItem(null)}
      />}
    </>
  )
}

function ManagePayslips({ copy, language, periodLabel, errorText, showToast }: SharedProps & {
  language: Language
  showToast: (message: string, kind?: 'error' | 'success' | 'info') => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<ManagedPayslipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [department, setDepartment] = useState('all')
  const [employee, setEmployee] = useState('all')
  const [draftFilter, setDraftFilter] = useState<Filter>('all')
  const [draftDepartment, setDraftDepartment] = useState('all')
  const [draftEmployee, setDraftEmployee] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [busyUser, setBusyUser] = useState<number | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [toDelete, setToDelete] = useState<ManagedPayslipRow | null>(null)
  const [previewItem, setPreviewItem] = useState<{ id: number; fileName: string } | null>(null)
  const [zoomAvatar, setZoomAvatar] = useState<{ src: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const rowInputRef = useRef<HTMLInputElement>(null)
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const pendingUserRef = useRef<ManagedPayslipRow | null>(null)
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const locale = language === 'th' ? 'th-TH' : 'en-US'

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await listManagedPayslips(year, month)) }
    catch (error) { setRows([]); showToast(errorText(error), 'error') }
    finally { setLoading(false) }
  }, [year, month, errorText, showToast])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!filterOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterWrapRef.current?.contains(event.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [filterOpen])

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, index) => current + 1 - index)
  }, [])
  const monthName = (value: number) => new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, value - 1, 1))
  const yearName = (value: number) => new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(value, 0, 1))
  const dateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(value))

  const stats = useMemo(() => {
    const sent = rows.filter((row) => row.payslipId !== null).length
    return { total: rows.length, sent, pending: rows.length - sent, viewed: rows.filter((row) => row.viewedAt).length }
  }, [rows])

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === 'pending' && row.payslipId !== null) return false
      if (filter === 'sent' && row.payslipId === null) return false
      if (filter === 'viewed' && !row.viewedAt) return false
      if (department !== 'all' && row.department !== department) return false
      if (employee !== 'all' && String(row.userId) !== employee) return false
      return !keyword || [row.name, row.email, row.department ?? ''].some((text) => text.toLowerCase().includes(keyword))
    })
  }, [rows, search, filter, department, employee])

  const departmentOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.department).filter((value): value is string => Boolean(value))).values()).sort((a, b) => a.localeCompare(b)),
    [rows],
  )
  const activeFilterCount = Number(filter !== 'all') + Number(department !== 'all') + Number(employee !== 'all')

  const validate = (file: File) => {
    if (file.size === 0 || file.size > MAX_BYTES) {
      showToast(copy.fileLimit, 'error')
      return false
    }
    return true
  }

  const pickFor = (row: ManagedPayslipRow) => { pendingUserRef.current = row; rowInputRef.current?.click() }

  const onRowFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const row = pendingUserRef.current
    event.target.value = ''
    if (!file || !row || !validate(file)) return
    setBusyUser(row.userId)
    try {
      await uploadPayslip(row.userId, year, month, file, '')
      showToast(row.payslipId ? copy.replaced : copy.uploaded, 'success')
      await load()
    } catch (error) { showToast(errorText(error), 'error') }
    finally { setBusyUser(null) }
  }

  const onBulkFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    if (!files.every(validate)) return
    setBulkBusy(true)
    try {
      const result = await bulkUploadPayslips(year, month, files)
      setBulkResult(result.failed.length > 0 ? result : null)
      showToast(fill(copy.bulkDone, { saved: result.saved.length, failed: result.failed.length }), result.failed.length ? 'info' : 'success')
      await load()
    } catch (error) { showToast(errorText(error), 'error') }
    finally { setBulkBusy(false) }
  }

  const confirmDelete = async () => {
    if (!toDelete?.payslipId) return
    setDeleting(true)
    try {
      await deletePayslip(toDelete.payslipId)
      showToast(copy.deleted, 'success')
      setToDelete(null)
      await load()
    } catch (error) { showToast(errorText(error), 'error') }
    finally { setDeleting(false) }
  }

  return (
    <>
      <div className="payslips-stats">
        <div><span>{copy.statTotal}</span><b>{stats.total}</b></div>
        <div className="is-sent"><span>{copy.statSent}</span><b>{stats.sent}</b></div>
        <div className="is-pending"><span>{copy.statPending}</span><b>{stats.pending}</b></div>
        <div><span>{copy.statViewed}</span><b>{stats.viewed}</b></div>
      </div>

      <div className="documents-filter-wrap" ref={filterWrapRef}>
      <div className="documents-tools payslips-toolbar">
        <select value={month} onChange={(event) => setMonth(Number(event.target.value))} aria-label={copy.month}>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{monthName(value)}</option>)}
        </select>
        <select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label={copy.year}>
          {yearOptions.map((value) => <option key={value} value={value}>{yearName(value)}</option>)}
        </select>
        <label className="payslips-search">
          <FaMagnifyingGlass aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        </label>
        <button type="button" className={`documents-filter-trigger ${activeFilterCount ? 'is-active' : ''}`} aria-expanded={filterOpen} onClick={() => {
          setDraftFilter(filter)
          setDraftDepartment(department)
          setDraftEmployee(employee)
          setFilterOpen((open) => !open)
        }}>
          <FaFilter /> {copy.filter}{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
        <button type="button" className="documents-primary" disabled={bulkBusy} onClick={() => bulkInputRef.current?.click()} title={copy.bulkHint}>
          <FaUpload /> {copy.bulkUpload}
        </button>
      </div>
      {filterOpen && <form className="documents-filter-panel" onSubmit={(event) => {
        event.preventDefault()
        setFilter(draftFilter)
        setDepartment(draftDepartment)
        setEmployee(draftEmployee)
        setFilterOpen(false)
      }}>
        <label className="documents-filter-field"><span>{copy.colStatus}</span>
          <select value={draftFilter} onChange={(event) => setDraftFilter(event.target.value as Filter)}>
            <option value="all">{copy.filterAll}</option>
            <option value="pending">{copy.filterPending}</option>
            <option value="sent">{copy.filterSent}</option>
            <option value="viewed">{copy.filterViewed}</option>
          </select>
        </label>
        <label className="documents-filter-field"><span>{copy.colDepartment}</span>
          <select value={draftDepartment} onChange={(event) => setDraftDepartment(event.target.value)}>
            <option value="all">{copy.filterAllDepartments}</option>
            {departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="documents-filter-field"><span>{copy.colEmployee}</span>
          <select value={draftEmployee} onChange={(event) => setDraftEmployee(event.target.value)}>
            <option value="all">{copy.filterAllEmployees}</option>
            {rows.map((row) => <option key={row.userId} value={row.userId}>{row.name}</option>)}
          </select>
        </label>
        <div className="documents-filter-actions">
          <button type="button" className="documents-filter-reset" onClick={() => {
            setFilter('all'); setDepartment('all'); setEmployee('all')
            setDraftFilter('all'); setDraftDepartment('all'); setDraftEmployee('all')
            setFilterOpen(false)
          }}>{copy.clearFilter}</button>
          <button type="submit" className="documents-filter-apply">{copy.applyFilter}</button>
        </div>
      </form>}
      </div>
      <p className="payslips-hint">{copy.bulkHint} · {copy.fileLimit}</p>

      <input ref={rowInputRef} type="file" hidden onChange={(event) => void onRowFile(event)} />
      <input ref={bulkInputRef} type="file" multiple hidden onChange={(event) => void onBulkFiles(event)} />

      {bulkResult && (
        <div className="payslips-bulk-result" role="status">
          <header>
            <strong>{copy.bulkFailedTitle} ({bulkResult.failed.length})</strong>
            <button type="button" onClick={() => setBulkResult(null)} aria-label={copy.close}>×</button>
          </header>
          <ul>{bulkResult.failed.map((item, index) => <li key={`${item.file}-${index}`}><b>{item.file}</b> — {item.reason}</li>)}</ul>
        </div>
      )}

      <div className="payslips-table-wrap">
        <table className="payslips-table">
          <thead>
            <tr>
              <th>{copy.colEmployee}</th>
              <th>{copy.colDepartment}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colFile}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const state = row.payslipId === null ? 'notSent' : row.viewedAt ? 'viewed' : 'sent'
              const payslipId = row.payslipId
              const profileImage = avatarSrc(row.avatarUrl)
              return (
                <tr key={row.userId}>
                  <td data-label={copy.colEmployee}>
                    <div className="payslips-employee">
                      {profileImage ? (
                        <button type="button" className="payslips-avatar payslips-avatar-button" title={row.name} aria-label={`${copy.viewProfile}: ${row.name}`} onClick={() => setZoomAvatar({ src: profileImage, name: row.name })}>
                          <img src={profileImage} alt="" />
                        </button>
                      ) : (
                        <span className="payslips-avatar">{row.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || <FaUser />}</span>
                      )}
                      <span><strong>{row.name}</strong><small>{row.email}</small></span>
                    </div>
                  </td>
                  <td data-label={copy.colDepartment}>{row.department ?? '-'}</td>
                  <td data-label={copy.colStatus}>
                    <span className={`documents-pill ${state === 'notSent' ? 'is-pending' : 'is-approved'}`}>
                      {state === 'notSent' ? copy.statusNotSent : state === 'viewed' ? copy.statusViewed : copy.statusSent}
                    </span>
                    {row.viewedAt && <small>{dateTime(row.viewedAt)}</small>}
                  </td>
                  <td data-label={copy.colFile}>{row.fileName ? <>{row.fileName}<small>{formatSize(row.fileSize ?? 0)}{row.updatedAt ? ` · ${dateTime(row.updatedAt)}` : ''}</small></> : '-'}</td>
                  <td data-label={copy.colActions} className="payslips-actions">
                    <button type="button" className="payslip-action" disabled={busyUser === row.userId} onClick={() => pickFor(row)}>
                      <FaUpload /> {row.payslipId ? copy.replace : copy.upload}
                    </button>
                    {payslipId !== null && (
                      <>
                        {canPreviewFile(row.fileName ?? '') && (
                          <button type="button" className="payslip-action" onClick={() => setPreviewItem({ id: payslipId, fileName: row.fileName ?? '' })}>
                            <FaEye /> {copy.preview}
                          </button>
                        )}
                        <a className="payslip-action" href={payslipFileUrl(payslipId, true)}><FaDownload /> {copy.download}</a>
                        <button type="button" className="payslip-action is-danger" onClick={() => setToDelete(row)}><FaTrash /> {copy.delete}</button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {!loading && visible.length === 0 && <tr><td colSpan={5} className="payslips-table-empty">{copy.noEmployees}</td></tr>}
          </tbody>
        </table>
      </div>

      {previewItem && <FilePreviewDialog
        url={payslipPreviewUrl(previewItem.id)}
        fileName={previewItem.fileName}
        closeLabel={copy.close}
        onClose={() => setPreviewItem(null)}
      />}
      {zoomAvatar && <div className="payslips-avatar-lightbox" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setZoomAvatar(null)
      }}>
        <button type="button" className="modal-close payslips-lightbox-close" aria-label={copy.close} onClick={() => setZoomAvatar(null)}><FaXmark /></button>
        <img src={zoomAvatar.src} alt={zoomAvatar.name} />
        <strong>{zoomAvatar.name}</strong>
      </div>}

      <ConfirmDialog
        open={toDelete !== null}
        variant="danger"
        loading={deleting}
        title={copy.deleteTitle}
        description={toDelete ? fill(copy.deleteBody, { name: toDelete.name, period: periodLabel(year, month) }) : ''}
        confirmLabel={copy.delete}
        cancelLabel={copy.cancel}
        onOpenChange={(open) => { if (!open) setToDelete(null) }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

function canPreviewFile(fileName: string) {
  return /\.(pdf|png|jpe?g|gif|webp)$/i.test(fileName)
}

function FilePreviewDialog({ url, fileName, closeLabel, onClose }: {
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
