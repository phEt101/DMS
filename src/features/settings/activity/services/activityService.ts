import { request } from '../../../../services/api'

export function listActivityLogs() {
  return request('/activity')
}
