import { request } from '../../../services/api'

export function getDashboardSummary() {
  return request('/dashboard')
}
