import { request } from '../../../services/api'

export function getDocumentReport() {
  return request('/reports/documents')
}
