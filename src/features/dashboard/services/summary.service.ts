import { apiUrl } from '../../../services/api'

export type DashboardBalance = { id: string; title: string; total: number; used: number; pending: number; remaining: number }
export type DashboardSummary = {
  stats: { total: number; pending: number; approved: number; rejected: number }
  balances: DashboardBalance[]
  recent: Array<{ id: number; requestNo: string; kind: string; status: string; days: number | null; startDate: string | null; endDate: string | null; leaveType: string | null }>
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function getMySummary(): Promise<DashboardSummary> {
  const response = await fetch(apiUrl('/employee-requests/summary'), { credentials: 'include' })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(json.message ?? `Request failed (${response.status})`, response.status)
  return json as DashboardSummary
}
