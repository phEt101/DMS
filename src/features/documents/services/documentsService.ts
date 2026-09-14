import { request } from '../../../services/api'

export function createDocument(data: unknown) {
  return request('/documents', { method: 'POST', body: JSON.stringify(data) })
}

export function updateDocument(documentId: string, data: unknown) {
  return request(`/documents/${documentId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function moveDocumentToTrash(documentId: string) {
  return request(`/documents/${documentId}`, { method: 'DELETE' })
}

export function updatePmProjectStatus(documentId: string, status: string) {
  return request(`/documents/${documentId}/project-status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export interface PmEquipment {
  id: number
  equipmentName: string
  equipmentModel: string | null
  faultSymptom: string | null
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
  referenceImageIds: string | null
}

export interface CreatePmEquipmentInput {
  equipmentName: string
  equipmentModel: string
  faultSymptom: string
  remarks: string
}

export function listPmEquipment(documentId: string) {
  return request(`/documents/${documentId}/equipment`) as Promise<{ data: PmEquipment[] }>
}

export function createPmEquipment(documentId: string, data: CreatePmEquipmentInput) {
  return request(`/documents/${documentId}/equipment`, { method: 'POST', body: JSON.stringify(data) }) as Promise<{ data: PmEquipment }>
}

export function updatePmEquipment(documentId: string, equipmentId: number, data: CreatePmEquipmentInput) {
  return request(`/documents/${documentId}/equipment/${equipmentId}`, { method: 'PATCH', body: JSON.stringify(data) }) as Promise<{ data: PmEquipment }>
}

export type PmEquipmentItemSection = 'cause' | 'action' | 'result'
export interface PmEquipmentItem { id?: number; section: PmEquipmentItemSection; itemNo: number; itemContent: string | null }

export function listPmEquipmentItems(documentId: string, equipmentId: number) {
  return request(`/documents/${documentId}/equipment/${equipmentId}/items`) as Promise<{ data: PmEquipmentItem[] }>
}

export function savePmEquipmentItems(documentId: string, equipmentId: number, items: PmEquipmentItem[], operatorIds: number[], statusMode: 'automatic' | 'on_hold' | 'waiting_parts') {
  return request(`/documents/${documentId}/equipment/${equipmentId}/items`, { method: 'PUT', body: JSON.stringify({ items, operatorIds, statusMode }) }) as Promise<{ data: PmEquipmentItem[]; equipment: PmEquipment }>
}

export function uploadPmEquipmentImages(documentId: string, equipmentId: number, beforeImages: File[], afterImages: File[], referenceImages: File[] = []) {
  const body = new FormData()
  referenceImages.forEach((file) => body.append('referenceImages', file))
  beforeImages.forEach((file) => body.append('beforeImages', file))
  afterImages.forEach((file) => body.append('afterImages', file))
  return request(`/documents/${documentId}/equipment/${equipmentId}/images`, { method: 'POST', body }) as Promise<{ data: { referenceIds: number[]; beforeIds: number[]; afterIds: number[] }; equipment: PmEquipment }>
}

export function pmEquipmentImageUrl(documentId: string, equipmentId: number, uploadId: number) {
  const prefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
  return `${prefix}/documents/${documentId}/equipment/${equipmentId}/images/${uploadId}`
}

export function deletePmEquipmentImage(documentId: string, equipmentId: number, uploadId: number) {
  return request(`/documents/${documentId}/equipment/${equipmentId}/images/${uploadId}`, { method: 'DELETE' }) as Promise<{ equipment: PmEquipment }>
}
