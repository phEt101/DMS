import { request } from '../../../../services/api'

export type PresenceStatus = 'active' | 'idle' | 'offline'
export type PresenceFilter = 'online' | 'active' | 'idle' | 'offline' | 'all'
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface SessionDevice {
  browser: string
  os: string
  type: DeviceType
}

export interface SessionUserRow {
  id: number
  name: string
  email: string
  avatarUrl: string | null
  company: string
  department: string | null
  role: string
  presence: PresenceStatus
  hasSession: boolean
  device: SessionDevice | null
  ipAddress: string | null
  lastActivityAt: string | null
  sessionStartedAt: string | null
  sessionExpiresAt: string | null
}

export interface SessionsSummary {
  active: number
  idle: number
  offline: number
  online: number
  total: number
}

export interface SessionsFilterOptions {
  departments: Array<{ id: number; name: string }>
  roles: string[]
}

export interface SessionsResponse {
  data: SessionUserRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  summary: SessionsSummary
  filters: SessionsFilterOptions
  generatedAt: string
}

export type SessionQuery = {
  status?: PresenceFilter
  search?: string
  departmentId?: string | number
  role?: string
  page?: number
  limit?: number
}

export function listSessions({
  status = 'online',
  search = '',
  departmentId = 'all',
  role = 'all',
  page = 1,
  limit = 10,
}: SessionQuery = {}): Promise<SessionsResponse> {
  const query = new URLSearchParams({
    status,
    search,
    departmentId: String(departmentId),
    role,
    page: String(page),
    limit: String(limit),
  })
  return request(`/sessions?${query}`) as Promise<SessionsResponse>
}
