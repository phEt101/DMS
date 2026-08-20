import { request } from '../../../services/api'

export function listDocuments() {
  return request('/documents')
}

export function createDocument(data: unknown) {
  return request('/documents', { method: 'POST', body: JSON.stringify(data) })
}

export function updateDocument(documentId: number, data: unknown) {
  return request(`/documents/${documentId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function moveDocumentToTrash(documentId: number) {
  return request(`/documents/${documentId}`, { method: 'DELETE' })
}
