import { request } from './api'

export function listDocuments() {
  return request('/api/documents')
}
