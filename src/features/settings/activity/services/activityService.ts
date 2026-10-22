import { request } from '../../../../services/api'

export interface ActivityLog {
  id: number
  module: string | null
  action: string
  entityType: string
  entityId: number | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
}

export interface ActivityLogResponse {
  data: ActivityLog[]
  meta: { page: number; limit: number; total: number }
}

export type ActivityLogQuery = {
  search?: string
  module?: string
  action?: string
  from?: string
  to?: string
}

export function listActivityLogs(page: number, limit: number, query: ActivityLogQuery = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  return request(`/activity?${params.toString()}`) as Promise<ActivityLogResponse>
}
