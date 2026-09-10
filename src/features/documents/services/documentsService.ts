import { request } from '../../../services/api'

export function createDocument(data: unknown) {
  return request('/documents', { method: 'POST', body: JSON.stringify(data) })
}

export function updateDocument(documentId: number, data: unknown) {
  return request(`/documents/${documentId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function moveDocumentToTrash(documentId: number) {
  return request(`/documents/${documentId}`, { method: 'DELETE' })
}

export function updatePmProjectStatus(documentId: number, status: string) {
  return request(`/documents/${documentId}/project-status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export interface PmEquipment {
  id: number
  equipmentName: string
  equipmentModel: string | null
  remarks: string | null
  workOrderStatus: string
  operator1Id: number | null
  operator1Name: string | null
  operator2Id: number | null
  operator2Name: string | null
  operator3Id: number | null
  operator3Name: string | null
  createdAt: string
  updatedAt: string
  beforeImageIds: string | null
  afterImageIds: string | null
}

export interface CreatePmEquipmentInput {
  equipmentName: string
  equipmentModel: string
  remarks: string
}

export function listPmEquipment(documentId: number) {
  return request(`/documents/${documentId}/equipment`) as Promise<{ data: PmEquipment[] }>
}

export function createPmEquipment(documentId: number, data: CreatePmEquipmentInput) {
  return request(`/documents/${documentId}/equipment`, { method: 'POST', body: JSON.stringify(data) }) as Promise<{ data: PmEquipment }>
}

export type PmEquipmentItemSection = 'cause' | 'action' | 'result'
export interface PmEquipmentItem { id?: number; section: PmEquipmentItemSection; itemNo: number; itemContent: string | null }

export function listPmEquipmentItems(documentId: number, equipmentId: number) {
  return request(`/documents/${documentId}/equipment/${equipmentId}/items`) as Promise<{ data: PmEquipmentItem[] }>
}

export function savePmEquipmentItems(documentId: number, equipmentId: number, items: PmEquipmentItem[], operatorIds: number[]) {
  return request(`/documents/${documentId}/equipment/${equipmentId}/items`, { method: 'PUT', body: JSON.stringify({ items, operatorIds }) }) as Promise<{ data: PmEquipmentItem[] }>
}

export function uploadPmEquipmentImages(documentId: number, equipmentId: number, beforeImages: File[], afterImages: File[]) {
  const body = new FormData()
  beforeImages.forEach((file) => body.append('beforeImages', file))
  afterImages.forEach((file) => body.append('afterImages', file))
  return request(`/documents/${documentId}/equipment/${equipmentId}/images`, { method: 'POST', body }) as Promise<{ data: { beforeIds: number[]; afterIds: number[] } }>
}

export function pmEquipmentImageUrl(documentId: number, equipmentId: number, uploadId: number) {
  const prefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
  return `${prefix}/documents/${documentId}/equipment/${equipmentId}/images/${uploadId}`
}
