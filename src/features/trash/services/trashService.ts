import { request } from '../../../services/api'

export function listDeletedDocuments() {
  return request('/documents/trash')
}

export function restoreDocument(documentId: string) {
  return request(`/documents/${documentId}/restore`, { method: 'POST' })
}
