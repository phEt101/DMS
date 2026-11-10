import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  FaBullhorn, FaCalendarDays, FaCheck, FaClock, FaDownload,
  FaEye, FaFileArrowUp, FaFileLines, FaMagnifyingGlass, FaPaperclip,
  FaPlus, FaRegBell, FaShieldHalved, FaXmark,
} from 'react-icons/fa6'
import { useToast } from '../../components/toast-provider'
import { useAuth } from '../auth/hooks/use-auth'
import { hasPermission } from '../auth/permissions'
import type { Language, Translations } from '../../locales'
import {
  announcementFileUrl, archiveAnnouncement, createAnnouncement, listAnnouncements,
  markAnnouncementRead, publishAnnouncement, type Announcement, type AnnouncementCategory,
  type AnnouncementAttachment,
} from './services/announcements.service'
import './announcements.css'

type Props = { translations: Translations; language: Language }
type Filter = 'all' | AnnouncementCategory | 'drafts'

const CATEGORY_KEYS: AnnouncementCategory[] = ['general', 'policy', 'annual', 'monthly']
const MAX_FILES = 8
const MAX_FILE_BYTES = 10 * 1024 * 1024
const OPEN_ANNOUNCEMENT_KEY = 'dms-open-announcement'

const formatSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`

function isPreviewable(file: AnnouncementAttachment) {
  return file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf'
}

export default function AnnouncementsPage({ translations, language }: Props) {
  const copy = translations.features.announcements
  const { user } = useAuth()
  const { showToast } = useToast()
  const isAdmin = user?.role.name.trim().toLowerCase() === 'admin'
  const canManage = Boolean(isAdmin || (
    user?.department?.trim().toLowerCase() === 'hr div.' && user && hasPermission(user, 'จัดการประกาศ')
  ))
  const locale = language === 'th' ? 'th-TH' : 'en-US'
  const [items, setItems] = useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Announcement | null>(null)
  const [composing, setComposing] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const result = await listAnnouncements()
      setItems(result.data)
      setUnreadCount(result.unreadCount)
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.errors.load, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const openRequested = () => {
      const announcementId = Number(sessionStorage.getItem(OPEN_ANNOUNCEMENT_KEY))
      if (!Number.isSafeInteger(announcementId) || announcementId < 1) return
      const item = items.find((entry) => entry.id === announcementId)
      if (!item) return
      sessionStorage.removeItem(OPEN_ANNOUNCEMENT_KEY)
      setSelected({ ...item, isRead: true })
      if (!item.isRead) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry))
        setUnreadCount((count) => Math.max(0, count - 1))
      }
    }
    window.addEventListener('dms:open-announcement', openRequested)
    openRequested()
    return () => window.removeEventListener('dms:open-announcement', openRequested)
  }, [items])

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase()
    return items.filter((item) => {
      if (filter === 'drafts' && item.status !== 'draft') return false
      if (filter !== 'all' && filter !== 'drafts' && item.category !== filter) return false
      return !keyword || [item.title, item.summary ?? '', item.content].some((value) => value.toLocaleLowerCase().includes(keyword))
    })
  }, [items, search, filter])

  const publishedItems = items.filter((item) => item.status === 'published')
  const draftCount = items.filter((item) => item.status === 'draft').length
  const dateLabel = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
    : ''

  const openAnnouncement = async (item: Announcement) => {
    setSelected(item)
    if (item.status !== 'published' || item.isRead) return
    try {
      await markAnnouncementRead(item.id)
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry))
      setSelected((current) => current?.id === item.id ? { ...current, isRead: true } : current)
      setUnreadCount((count) => Math.max(0, count - 1))
      window.dispatchEvent(new Event('dms:announcement-data-changed'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.errors.read, 'error')
    }
  }

  const onCreate = async (event: FormEvent<HTMLFormElement>, files: File[]) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (files.length > MAX_FILES) {
      showToast(copy.errors.fileCount, 'error')
      return
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      showToast(copy.errors.fileSize, 'error')
      return
    }
    setSaving(true)
    try {
      await createAnnouncement({
        title: String(data.get('title') ?? '').trim(),
        summary: String(data.get('summary') ?? '').trim(),
        content: String(data.get('content') ?? '').trim(),
        category: String(data.get('category') ?? 'general') as AnnouncementCategory,
        expiresAt: String(data.get('expiresAt') ?? ''),
        publishImmediately: data.get('publishImmediately') === 'on',
        files,
      })
      showToast(data.get('publishImmediately') === 'on' ? copy.messages.published : copy.messages.draftSaved, 'success')
      setComposing(false)
      await load()
      window.dispatchEvent(new Event('dms:announcement-data-changed'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.errors.save, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onPublish = async (item: Announcement) => {
    try {
      await publishAnnouncement(item.id)
      showToast(copy.messages.published, 'success')
      await load()
      setSelected((current) => current?.id === item.id ? { ...current, status: 'published', publishedAt: new Date().toISOString() } : current)
      window.dispatchEvent(new Event('dms:announcement-data-changed'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.errors.publish, 'error')
    }
  }

  const onArchive = async (item: Announcement) => {
    if (!window.confirm(copy.archiveConfirm)) return
    try {
      await archiveAnnouncement(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      if (item.status === 'published' && !item.isRead) setUnreadCount((count) => Math.max(0, count - 1))
      if (selected?.id === item.id) setSelected(null)
      showToast(copy.messages.archived, 'success')
      window.dispatchEvent(new Event('dms:announcement-data-changed'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.errors.archive, 'error')
    }
  }

  const feature = visibleItems.find((item) => item.status === 'published')

  return <div className="dms-page-root announcements-page-root">
    <section className="dms-col-main announcements-page">
      <div className="announcement-heading">
        <div>
          <p className="dms-kicker">{copy.kicker}</p>
          <div className="dms-title-row">
            <div className="dms-title-block">
              <h1>{copy.title}</h1>
              <div className="dms-subtitle">{copy.subtitle}</div>
            </div>
          </div>
        </div>
        {canManage && <button className="announcement-primary-button" type="button" onClick={() => setComposing(true)}>
          <FaPlus aria-hidden="true" /> {copy.create}
        </button>}
      </div>

      <section className="announcement-hero">
        <div className="announcement-hero-art" aria-hidden="true">
          <span className="announcement-hero-orbit announcement-hero-orbit-one" />
          <span className="announcement-hero-orbit announcement-hero-orbit-two" />
          <span className="announcement-hero-bell"><FaBullhorn /></span>
          <span className="announcement-hero-dot announcement-hero-dot-one" />
          <span className="announcement-hero-dot announcement-hero-dot-two" />
        </div>
        <div className="announcement-hero-copy">
          <span className="announcement-eyebrow"><FaRegBell /> {copy.heroEyebrow}</span>
          <h2>{copy.heroTitle}</h2>
          <p>{copy.heroDescription}</p>
        </div>
        <div className="announcement-stats">
          <div><span>{copy.stats.published}</span><strong>{publishedItems.length}</strong></div>
          <div className="is-unread"><span>{copy.stats.unread}</span><strong>{unreadCount}</strong></div>
          {canManage && <div className="is-draft"><span>{copy.stats.drafts}</span><strong>{draftCount}</strong></div>}
        </div>
      </section>

      <div className="announcement-toolbar">
        <div className="announcement-filters" role="tablist" aria-label={copy.filters.label}>
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>{copy.filters.all}</button>
          {CATEGORY_KEYS.map((category) => <button
            type="button"
            role="tab"
            aria-selected={filter === category}
            className={filter === category ? 'is-selected' : ''}
            key={category}
            onClick={() => setFilter(category)}
          >{copy.categories[category]}</button>)}
          {canManage && <button type="button" role="tab" aria-selected={filter === 'drafts'} onClick={() => setFilter('drafts')}>
            {copy.filters.drafts}{draftCount > 0 && <span className="announcement-filter-count">{draftCount}</span>}
          </button>}
        </div>
        <label className="announcement-search">
          <FaMagnifyingGlass aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        </label>
      </div>

      {loading
        ? <div className="announcement-state"><span className="announcement-spinner" />{copy.loading}</div>
        : visibleItems.length === 0
          ? <div className="announcement-empty">
              <span className="announcement-empty-icon"><FaBullhorn /></span>
              <h2>{search ? copy.empty.searchTitle : filter === 'drafts' ? copy.empty.draftsTitle : copy.empty.title}</h2>
              <p>{search ? copy.empty.searchDescription : filter === 'drafts' ? copy.empty.draftsDescription : copy.empty.description}</p>
              {canManage && !search && filter !== 'drafts' && <button type="button" className="announcement-empty-action" onClick={() => setComposing(true)}>
                <FaPlus /> {copy.createFirst}
              </button>}
            </div>
          : <div className={`announcement-list${feature ? ' has-feature' : ''}`}>
              {visibleItems.map((item, index) => <AnnouncementCard
                key={item.id}
                item={item}
                copy={copy}
                dateLabel={dateLabel}
                isFeatured={item.id === feature?.id && filter === 'all' && !search}
                canManage={canManage}
                onOpen={() => void openAnnouncement(item)}
                onPublish={() => void onPublish(item)}
                onArchive={() => void onArchive(item)}
                styleDelay={Math.min(index, 8) * 45}
              />)}
            </div>}
    </section>

    {composing && <ComposeDialog copy={copy} saving={saving} onClose={() => !saving && setComposing(false)} onSubmit={onCreate} />}
    {selected && <AnnouncementDialog
      item={selected}
      copy={copy}
      canManage={canManage}
      dateLabel={dateLabel}
      onClose={() => setSelected(null)}
      onPublish={() => void onPublish(selected)}
      onArchive={() => void onArchive(selected)}
    />}
  </div>
}

function AnnouncementCard({
  item, copy, dateLabel, isFeatured, canManage, onOpen, onPublish, onArchive, styleDelay,
}: {
  item: Announcement
  copy: any
  dateLabel: (value: string | null) => string
  isFeatured: boolean
  canManage: boolean
  onOpen: () => void
  onPublish: () => void
  onArchive: () => void
  styleDelay: number
}) {
  const categoryLabel = copy.categories[item.category]
  const imageFiles = item.files.filter((file) => file.mimeType.startsWith('image/'))
  return <article className={`announcement-card category-${item.category}${isFeatured ? ' is-featured' : ''}${!item.isRead && item.status === 'published' ? ' is-unread' : ''}`} style={{ animationDelay: `${styleDelay}ms` }}>
    {imageFiles.length > 0 && <div className={`announcement-card-gallery image-count-${Math.min(imageFiles.length, 3)}`}>
      {imageFiles.slice(0, 3).map((file, index) => <div className={`announcement-card-image image-index-${index}`} key={file.id}>
        <img src={announcementFileUrl(item.id, file.id, true)} alt={`${item.title} ${copy.imageNumber.replace('{number}', String(index + 1))}`} loading="lazy" />
      </div>)}
    </div>}
    <div className="announcement-card-topline">
      <span className={`announcement-category category-${item.category}`}>
        {item.category === 'policy' ? <FaShieldHalved /> : item.category === 'annual' || item.category === 'monthly' ? <FaCalendarDays /> : <FaBullhorn />}
        {categoryLabel}
      </span>
      {item.status === 'draft'
        ? <span className="announcement-status is-draft"><FaClock /> {copy.draft}</span>
        : !item.isRead && <span className="announcement-status is-new"><span /> {copy.new}</span>}
    </div>
    <button className="announcement-card-main" type="button" onClick={onOpen}>
      <span className="announcement-card-date">{dateLabel(item.publishedAt ?? item.createdAt)}</span>
      <h2>{item.title}</h2>
      {item.summary && <p className="announcement-summary">{item.summary}</p>}
      <p className="announcement-card-content">{item.content}</p>
      <span className="announcement-card-meta">
        <span><FaFileLines /> {item.files.length ? copy.fileCount.replace('{count}', String(item.files.length)) : copy.noFiles}</span>
        {item.status === 'published' && <span><FaEye /> {copy.readCount.replace('{count}', String(item.readCount))}</span>}
        {item.expiresAt && <span><FaCalendarDays /> {copy.validUntil.replace('{date}', dateLabel(item.expiresAt))}</span>}
      </span>
    </button>
    <div className="announcement-card-footer">
      <span className="announcement-author-avatar">{item.author.slice(0, 1)}</span>
      <span className="announcement-author">{item.author}<small>{copy.postedBy}</small></span>
      {item.files.length > 0 && <span className="announcement-attachment-count"><FaPaperclip /> {item.files.length}</span>}
      {canManage && <div className="announcement-card-actions">
        {item.status === 'draft' && <button type="button" className="announcement-publish-button" onClick={onPublish}><FaCheck /> {copy.publish}</button>}
        <button type="button" className="announcement-archive-button" onClick={onArchive}>{copy.archive}</button>
      </div>}
    </div>
  </article>
}

function ComposeDialog({ copy, saving, onClose, onSubmit }: {
  copy: any
  saving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>, files: File[]) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const previews = useMemo(() => files.map((file) => ({
    file,
    url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
  })), [files])
  useEffect(() => () => previews.forEach(({ url }) => url && URL.revokeObjectURL(url)), [previews])

  const addFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return
    setFiles((current) => [...current, ...Array.from(selectedFiles)])
  }

  return createPortal(<div className="announcement-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="announcement-dialog announcement-compose-dialog" role="dialog" aria-modal="true" aria-labelledby="announcement-compose-title">
      <header className="announcement-dialog-header">
        <div><span className="announcement-dialog-icon"><FaBullhorn /></span><div><h2 id="announcement-compose-title">{copy.compose.title}</h2><p>{copy.compose.subtitle}</p></div></div>
        <button type="button" className="announcement-dialog-close" onClick={onClose} aria-label={copy.close}><FaXmark /></button>
      </header>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(event, files) }}>
        <div className="announcement-compose-body">
          <label className="announcement-form-field">
            <span>{copy.compose.headline}<b>*</b></span>
            <input name="title" required maxLength={200} placeholder={copy.compose.headlinePlaceholder} />
          </label>
          <div className="announcement-form-row">
            <label className="announcement-form-field">
              <span>{copy.compose.category}<b>*</b></span>
              <select name="category" defaultValue="general">
                {CATEGORY_KEYS.map((category) => <option value={category} key={category}>{copy.categories[category]}</option>)}
              </select>
            </label>
            <label className="announcement-form-field">
              <span>{copy.compose.expiresAt}</span>
              <input name="expiresAt" type="date" />
            </label>
          </div>
          <label className="announcement-form-field">
            <span>{copy.compose.summary}</span>
            <input name="summary" maxLength={500} placeholder={copy.compose.summaryPlaceholder} />
          </label>
          <label className="announcement-form-field">
            <span>{copy.compose.content}<b>*</b></span>
            <textarea name="content" required maxLength={60000} rows={7} placeholder={copy.compose.contentPlaceholder} />
          </label>
          <div className="announcement-form-field">
            <span>{copy.compose.attachments}</span>
            <input ref={fileInput} className="announcement-file-input" type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = '' }} />
            <button type="button" className="announcement-file-dropzone" onClick={() => fileInput.current?.click()}>
              <span><FaFileArrowUp /></span><b>{copy.compose.dropTitle}</b><small>{copy.compose.dropDescription}</small>
            </button>
            {previews.length > 0 && <div className="announcement-selected-files">
              {previews.map(({ file, url }, index) => <div className="announcement-selected-file" key={`${file.name}-${index}`}>
                {url ? <img src={url} alt="" /> : <span className="announcement-selected-file-icon"><FaFileLines /></span>}
                <span><b>{file.name}</b><small>{formatSize(file.size)}</small></span>
                <button type="button" aria-label={copy.removeFile.replace('{name}', file.name)} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><FaXmark /></button>
              </div>)}
            </div>}
          </div>
          <label className="announcement-publish-toggle">
            <input type="checkbox" name="publishImmediately" defaultChecked />
            <span className="announcement-toggle-mark"><FaCheck /></span>
            <span><b>{copy.compose.publishNow}</b><small>{copy.compose.publishHint}</small></span>
          </label>
        </div>
        <footer className="announcement-dialog-footer">
          <button type="button" className="announcement-secondary-button" onClick={onClose} disabled={saving}>{copy.cancel}</button>
          <button type="submit" className="announcement-primary-button" disabled={saving}>
            {saving ? <><span className="announcement-button-spinner" /> {copy.saving}</> : <><FaPlus /> {copy.compose.save}</>}
          </button>
        </footer>
      </form>
    </section>
  </div>, document.body)
}

function AnnouncementDialog({ item, copy, canManage, dateLabel, onClose, onPublish, onArchive }: {
  item: Announcement
  copy: any
  canManage: boolean
  dateLabel: (value: string | null) => string
  onClose: () => void
  onPublish: () => void
  onArchive: () => void
}) {
  return createPortal(<div className="announcement-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="announcement-dialog announcement-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="announcement-detail-title">
      <header className="announcement-detail-header">
        <button type="button" className="announcement-dialog-close" onClick={onClose} aria-label={copy.close}><FaXmark /></button>
        <span className={`announcement-category category-${item.category}`}>
          {item.category === 'policy' ? <FaShieldHalved /> : item.category === 'annual' || item.category === 'monthly' ? <FaCalendarDays /> : <FaBullhorn />}
          {copy.categories[item.category]}
        </span>
        <span className="announcement-detail-date">{dateLabel(item.publishedAt ?? item.createdAt)}</span>
        <h2 id="announcement-detail-title">{item.title}</h2>
        {item.summary && <p className="announcement-detail-summary">{item.summary}</p>}
        <div className="announcement-detail-author"><span className="announcement-author-avatar">{item.author.slice(0, 1)}</span><span>{item.author}<small>{copy.postedBy}</small></span></div>
      </header>
      <div className="announcement-detail-body">
        <p className="announcement-detail-content">{item.content}</p>
        {item.expiresAt && <div className="announcement-expiration-note"><FaCalendarDays /> {copy.validUntil.replace('{date}', dateLabel(item.expiresAt))}</div>}
        {item.files.length > 0 && <section className="announcement-detail-files">
          <h3><FaPaperclip /> {copy.attachmentsHeading} <span>{item.files.length}</span></h3>
          <div className="announcement-detail-file-list">
            {item.files.map((file) => <AttachmentItem key={file.id} announcementId={item.id} file={file} copy={copy} />)}
          </div>
        </section>}
      </div>
      {canManage && <footer className="announcement-dialog-footer announcement-detail-footer">
        <button type="button" className="announcement-archive-button" onClick={onArchive}>{copy.archive}</button>
        <span />
        {item.status === 'draft' && <button type="button" className="announcement-primary-button" onClick={onPublish}><FaCheck /> {copy.publish}</button>}
        <button type="button" className="announcement-secondary-button" onClick={onClose}>{copy.close}</button>
      </footer>}
    </section>
  </div>, document.body)
}

function AttachmentItem({ announcementId, file, copy }: { announcementId: number; file: AnnouncementAttachment; copy: any }) {
  const url = announcementFileUrl(announcementId, file.id, isPreviewable(file))
  const image = file.mimeType.startsWith('image/')
  return <a className={`announcement-detail-file${image ? ' is-image' : ''}`} href={url} target="_blank" rel="noreferrer" download={image || file.mimeType === 'application/pdf' ? undefined : file.fileName}>
    {image
      ? <img className="announcement-file-thumbnail" src={url} alt="" />
      : <span className="announcement-file-icon"><FaFileLines /></span>}
    <span className="announcement-file-info"><b>{file.fileName}</b><small>{formatSize(file.fileSize)} · {file.mimeType === 'application/pdf' ? copy.fileTypes.pdf : image ? copy.fileTypes.image : copy.fileTypes.document}</small></span>
    <span className="announcement-file-download"><FaDownload /><span>{copy.download}</span></span>
  </a>
}
