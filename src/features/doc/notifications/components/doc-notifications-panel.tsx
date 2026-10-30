import { useEffect, useMemo, useState } from 'react'
import type { MockNotification } from '../../document-types'
import {
  FaBan, FaBell, FaCheckDouble, FaCircleCheck, FaCircleXmark, FaEnvelope, FaFileLines, FaPaperPlane, FaHourglassHalf,
} from 'react-icons/fa6'

type Props = {
  notifications: MockNotification[]
  emailEnabled: boolean
  onEmailEnabled: (enabled: boolean) => void
  onReadAll: () => void
  tab: 'app' | 'email'
  onTab: (tab: 'app' | 'email') => void
  onOpen: (notification: MockNotification) => void
  copy: any
}

type Tone = 'approved' | 'rejected' | 'cancelled' | 'submitted' | 'pending'

const TONE_ICON = {
  approved: FaCircleCheck,
  rejected: FaCircleXmark,
  cancelled: FaBan,
  submitted: FaPaperPlane,
  pending: FaHourglassHalf,
} as const

// หาชนิดของแจ้งเตือนจาก event (โหมด DB) ถ้าไม่มีให้เดาจากข้อความสถานะใน body
const detectTone = (notification: MockNotification, c: any): Tone => {
  const event = String((notification as any).event ?? '').toLowerCase()
  const body = String(notification.body ?? '')
  if (event.includes('reject')) return 'rejected'
  if (event.includes('cancel')) return 'cancelled'
  if (event.includes('approv')) return 'approved'
  if (event.includes('submit') || event.includes('creat')) return 'submitted'
  const s = c.statuses ?? {}
  if (s.rejected && body.includes(s.rejected)) return 'rejected'
  if (s.cancelled && body.includes(s.cancelled)) return 'cancelled'
  if (s.approved && body.includes(s.approved)) return 'approved'
  return 'pending'
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export default function DocNotificationsPanel({ notifications, emailEnabled, onEmailEnabled, onReadAll, tab, onTab, onOpen, copy: c }: Props) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const isThai = String(c.dateLocale ?? '').startsWith('th')
  const text = {
    all: c.notifications.filterAll ?? (isThai ? 'ทั้งหมด' : 'All'),
    unread: c.notifications.filterUnread ?? (isThai ? 'ยังไม่อ่าน' : 'Unread'),
    emptyTitle: c.notifications.emptyTitle ?? (isThai ? 'ไม่มีแจ้งเตือนใหม่' : "You're all caught up"),
    emptyBody: c.notifications.emptyBody ?? (isThai ? 'เมื่อมีเอกสารรอคุณ จะแสดงที่นี่' : 'New document updates will show up here'),
  }

  const rtf = useMemo(() => new Intl.RelativeTimeFormat(c.dateLocale, { numeric: 'auto' }), [c.dateLocale])
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(c.dateLocale, { day: 'numeric', month: 'short', year: '2-digit' }), [c.dateLocale])
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(c.dateLocale, { hour: '2-digit', minute: '2-digit' }), [c.dateLocale])

  const [useDbMode, setUseDbMode] = useState(false)
  useEffect(() => {
    fetch('/boswell-api/v1/health').then((r) => setUseDbMode(r.ok)).catch(() => {})
  }, [])

  // หน้าแท็บ "อีเมลที่ส่ง" เป็น mock เท่านั้น (ยังไม่ได้ส่งอีเมลจริง) — ซ่อนในโหมด DB
  if (useDbMode && tab === 'email') onTab('app')

  const unreadCount = notifications.filter((n) => !n.read).length

  const groups = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const list = [...notifications]
      .filter((n) => filter === 'all' || !n.read)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const map = new Map<string, { label: string; items: MockNotification[] }>()
    list.forEach((n) => {
      const d = new Date(n.date)
      const diffDays = Math.round((todayStart - startOfDay(d)) / 86400000)
      const key = diffDays <= 0 ? 'd0' : diffDays === 1 ? 'd1' : diffDays < 7 ? 'w' : 'old'
      const label = key === 'd0' ? rtf.format(0, 'day') : key === 'd1' ? rtf.format(-1, 'day') : key === 'w' ? rtf.format(-1, 'week') : dateFmt.format(d)
      const bucket = key === 'old' ? `old-${dateFmt.format(d)}` : key
      if (!map.has(bucket)) map.set(bucket, { label, items: [] })
      map.get(bucket)!.items.push(n)
    })
    return Array.from(map.entries())
  }, [notifications, filter, rtf, dateFmt])

  const timeLabel = (value: string) => {
    const d = new Date(value)
    const minutes = Math.round((Date.now() - d.getTime()) / 60000)
    if (minutes < 1) return rtf.format(0, 'second')
    if (minutes < 60) return rtf.format(-minutes, 'minute')
    if (minutes < 60 * 12) return rtf.format(-Math.round(minutes / 60), 'hour')
    return timeFmt.format(d)
  }

  let animIndex = 0

  return <>
    <div className="documents-tools documents-notification-tools">
      <label className="documents-email-toggle">
        <input type="checkbox" checked={emailEnabled} onChange={(event) => onEmailEnabled(event.target.checked)} />
        <span>{c.notifications.emailToggle}: <b className={emailEnabled ? 'is-on' : 'is-off'}>{emailEnabled ? c.notifications.emailOn : c.notifications.emailOff}</b></span>
      </label>
      <button type="button" className="documents-readall" onClick={onReadAll} disabled={unreadCount === 0}>
        <FaCheckDouble /> {c.notifications.readAll}
      </button>
    </div>

    <div className="documents-notification-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'app'} aria-pressed={tab === 'app'} onClick={() => onTab('app')}>
        <FaBell /> {c.notifications.inApp}
        <span className={`documents-tab-count${unreadCount ? ' has-unread' : ''}`}>{unreadCount || notifications.length}</span>
      </button>
      <button type="button" role="tab" aria-selected={tab === 'email'} aria-pressed={tab === 'email'} onClick={() => { if (!useDbMode) onTab('email') }} disabled={useDbMode} title={useDbMode ? (c.notifications.emailDisabledTitle ?? 'ยังไม่เปิดใช้การส่งอีเมลจริง') : undefined}>
        <FaEnvelope /> {c.notifications.sentEmail}
        {!useDbMode && <span className="documents-tab-count">2</span>}
      </button>
    </div>

    {tab === 'app' ? <>
      <div className="documents-notification-filter" role="group">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{text.all}</button>
        <button type="button" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
          {text.unread}{unreadCount > 0 && <span className="documents-filter-badge">{unreadCount}</span>}
        </button>
      </div>

      {groups.length === 0
        ? <div className="documents-notification-empty">
            <span className="documents-notification-empty-icon"><FaBell /></span>
            <b>{text.emptyTitle}</b>
            <small>{text.emptyBody}</small>
          </div>
        : <div className="documents-notification-list">
            {groups.map(([key, group]) => <section key={key} className="documents-notification-group">
              <h3 className="documents-notification-group-title">{group.label}</h3>
              {group.items.map((notification) => {
                const tone = detectTone(notification, c)
                const Icon = TONE_ICON[tone] ?? FaFileLines
                const sample = c.sampleNotifications?.[String(notification.id)] ?? notification
                const delay = Math.min(animIndex++, 8) * 45
                return <button
                  type="button"
                  key={notification.id}
                  className={`documents-notification tone-${tone} ${notification.read ? '' : 'is-unread'}`}
                  style={{ animationDelay: `${delay}ms` }}
                  onClick={() => onOpen(notification)}
                >
                  <span className="documents-icon documents-notification-icon"><Icon /></span>
                  <span className="documents-notification-content">
                    <b>{sample.title}</b>
                    <small>{sample.body}</small>
                  </span>
                  <span className="documents-notification-meta">
                    <time dateTime={notification.date}>{timeLabel(notification.date)}</time>
                    {!notification.read && <i className="documents-unread-dot" aria-label={text.unread} />}
                  </span>
                </button>
              })}
            </section>)}
          </div>}
    </> : <div className="documents-email-preview">
      <p>{c.notifications.mockNote}</p>
      <article>
        <span className="documents-email-avatar"><FaEnvelope /></span>
        <div>
          <b>{c.notifications.emailSubject}</b>
          <small>{c.notifications.to}: {c.notifications.recipientOne} · {c.notifications.emailDate}</small>
          <span>{c.notifications.emailPreview}</span>
        </div>
      </article>
      <article>
        <span className="documents-email-avatar"><FaEnvelope /></span>
        <div>
          <b>{c.notifications.secondSubject}</b>
          <small>{c.notifications.to}: {c.notifications.recipientTwo} · {c.notifications.emailDate}</small>
          <span>{c.notifications.secondPreview}</span>
        </div>
      </article>
    </div>}
  </>
}