import { request } from '../../../services/api'

export function getProjectReport() {
  return request('/reports/projects')
}
