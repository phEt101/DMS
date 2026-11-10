import { apiUrl } from '../../../services/api'

const BASE = '/announcements'

export type AnnouncementCategory = 'general' | 'policy' | 'annual' | 'monthly'
export type AnnouncementStatus = 'draft' | 'published'
export type AnnouncementAttachment = {
  id: number
  fileName: string
  mimeType: string
  fileSize: number
}
export type Announcement = {
  id: number
  title: string
  summary: string | null
  content: string
  category: AnnouncementCategory
  status: AnnouncementStatus
  expiresAt: string | null
  publishedAt: string | null
  createdAt: string
  author: string
  isRead: boolean
  readCount: number
  files: AnnouncementAttachment[]
}
export type AnnouncementList = { data: Announcement[]; unreadCount: number }
export type AnnouncementNotification = Pick<Announcement, 'id' | 'title' | 'summary' | 'category' | 'publishedAt' | 'isRead'>
export type AnnouncementNotificationList = { data: AnnouncementNotification[]; unreadCount: number }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData
  const response = await fetch(apiUrl(`${BASE}${path}`), {
    credentials: 'include',
    ...init,
    headers: { ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (response.status === 204) return undefined as T
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(json.message ?? `Request failed (${response.status})`)
  return json as T
}

export function listAnnouncements() {
  return call<AnnouncementList>('/')
}

export function getUnreadAnnouncementCount() {
  return call<{ data: number }>('/unread-count')
}

export function listAnnouncementNotifications() {
  return call<AnnouncementNotificationList>('/notifications')
}

export function markAllAnnouncementNotificationsRead() {
  return call<void>('/read-all', { method: 'POST' })
}

export function createAnnouncement(input: {
  title: string
  summary: string
  content: string
  category: AnnouncementCategory
  expiresAt: string
  publishImmediately: boolean
  files: File[]
}) {
  const form = new FormData()
  form.set('title', input.title)
  form.set('summary', input.summary)
  form.set('content', input.content)
  form.set('category', input.category)
  form.set('expiresAt', input.expiresAt)
  form.set('publishImmediately', String(input.publishImmediately))
  input.files.forEach((file) => form.append('files', file))
  return call<{ data: { id: number; status: AnnouncementStatus } }>('/', { method: 'POST', body: form })
}

export function publishAnnouncement(id: number) {
  return call<{ data: { id: number; status: 'published' } }>(`/${id}/publish`, { method: 'POST' })
}

export function archiveAnnouncement(id: number) {
  return call<void>(`/${id}`, { method: 'DELETE' })
}

export function markAnnouncementRead(id: number) {
  return call<void>(`/${id}/read`, { method: 'POST' })
}

export function announcementFileUrl(announcementId: number, fileId: number, preview = false) {
  const query = preview ? '?preview=1' : ''
  return apiUrl(`${BASE}/${announcementId}/files/${fileId}${query}`)
}
