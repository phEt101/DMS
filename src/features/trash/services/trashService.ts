import { request } from '../../../services/api'

export function listDeletedDocuments() {
  return request('/documents/trash')
}

export function restoreDocument(documentId: number) {
  return request(`/documents/${documentId}/restore`, { method: 'POST' })
}
