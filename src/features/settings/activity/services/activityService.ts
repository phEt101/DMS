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

export function listActivityLogs(page: number, limit: number) {
  return request(`/activity?page=${page}&limit=${limit}`) as Promise<ActivityLogResponse>
}
