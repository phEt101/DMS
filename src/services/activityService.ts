import { request } from './api'

export function listActivityLogs() {
  return request('/api/activity')
}
