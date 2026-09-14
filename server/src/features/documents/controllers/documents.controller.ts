import * as documents from '../repositories/documents.repository.js'
import * as pmProjects from '../repositories/documents-pm-projects.repository.js'
import * as pmDetails from '../repositories/documents-pm-details.repository.js'
import { logActivity } from '../../settings/activity/repositories/activity.repository.js'
import { httpError } from '../../../middleware/errors.js'
import { equipmentStorageDirectory } from '../middleware/equipment-images.middleware.js'
import { unlink } from 'node:fs/promises'
import type { RequestHandler } from 'express'
import { isDocumentPublicId } from '../services/document-public-id.service.js'

function positiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) && number > 0 ? Math.min(number, maximum) : fallback
}

function requireNonEmptyString(body: Record<string, unknown>, field: string, message: string) {
  if (typeof body[field] !== 'string' || !body[field].trim()) {
    throw httpError(400, message)
  }
}

function validatePmDates(body: Record<string, unknown>) {
  const startDate = typeof body.plannedStartDate === 'string' ? body.plannedStartDate.trim() : ''
  const endDate = typeof body.plannedEndDate === 'string' ? body.plannedEndDate.trim() : ''

  if (!startDate) {
    throw httpError(400, 'plannedStartDate is required')
  }

  if (!endDate) {
    throw httpError(400, 'plannedEndDate is required')
  }

  if (startDate > endDate) {
    throw httpError(400, 'plannedStartDate must be before or equal to plannedEndDate')
  }
}

function routeParam(value: string | string[] | undefined): string {
  if (typeof value !== 'string') throw httpError(400, 'Invalid route parameter')
  return value
}

async function documentFromRoute(value: string | string[] | undefined) {
  const encryptedId = routeParam(value)
  if (!isDocumentPublicId(encryptedId)) return null
  return documents.findByEncryptedId(encryptedId)
}

function publicDocument<T extends { id: number }>(document: T) {
  const { id: _internalId, ...data } = document
  return data
}

export const index: RequestHandler = async (req, res) => {
  const page = positiveInteger(req.query.page, 1)
  const limit = positiveInteger(req.query.limit, 50, 100)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const allowedStatuses = ['draft', 'approved', 'archived'] as const
  const requestedStatus = typeof req.query.status === 'string' ? req.query.status : ''
  const status = allowedStatuses.find((value) => value === requestedStatus)
  const requestedTypeId = Number(req.query.documentTypeId)
  const documentTypeId = Number.isInteger(requestedTypeId) && requestedTypeId > 0 ? requestedTypeId : undefined
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  const dateFrom = typeof req.query.dateFrom === 'string' && datePattern.test(req.query.dateFrom) ? req.query.dateFrom : undefined
  const dateTo = typeof req.query.dateTo === 'string' && datePattern.test(req.query.dateTo) ? req.query.dateTo : undefined
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc'
  const filters = { search, status, documentTypeId, dateFrom, dateTo }
  const [data, total] = await Promise.all([
    documents.findAll({ ...filters, sortOrder, limit, offset: (page - 1) * limit }),
    documents.countAll(filters),
  ])
  res.json({
    data: data.map(publicDocument),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export const trashIndex: RequestHandler = async (_req, res) => {
  const data = await documents.findAll({ deleted: true })
  res.json({ data: data.map(publicDocument) })
}

export const show: RequestHandler = async (req, res) => {
  const data = await documentFromRoute(req.params.encryptedId)
  if (!data) return res.status(404).json({ message: 'Document not found' })
  res.json({ data: publicDocument(data) })
}

export const store: RequestHandler = async (req, res) => {
  const body = { ...req.body }
  requireNonEmptyString(body, 'siteAddress', 'siteAddress is required')
  validatePmDates(body)

  const documentTypeId = Number(body.documentTypeId ?? body.document_type_id ?? 0)
  if (!Number.isFinite(documentTypeId) || documentTypeId <= 0) {
    throw httpError(400, 'documentTypeId is required')
  }

  const document = await documents.create({
    documentTypeId,
    projectManagerName: typeof body.projectManagerName === 'string' ? body.projectManagerName.trim() : null,
    customerName: typeof body.customerName === 'string' ? body.customerName.trim() : null,
    uploadedBy: req.user?.id ?? null,
  })

  const hasPmProjectPayload =
    typeof body.siteAddress === 'string' ||
    typeof body.latitude === 'string' ||
    typeof body.longitude === 'string' ||
    typeof body.plannedStartDate === 'string' ||
    typeof body.plannedEndDate === 'string'

  if (hasPmProjectPayload) {
    await pmProjects.create({
      documentId: document.id,
      projectsName: typeof body.projectName === 'string' ? body.projectName.trim() : null,
      projectDescription: typeof body.description === 'string' ? body.description.trim() : null,
      siteAddress: typeof body.siteAddress === 'string' ? body.siteAddress.trim() : null,
      siteLat: body.latitude ?? null,
      siteLon: body.longitude ?? null,
      plannedStartDate: typeof body.plannedStartDate === 'string' ? body.plannedStartDate : null,
      plannedEndDate: typeof body.plannedEndDate === 'string' ? body.plannedEndDate : null,
      createdBy: req.user?.id ?? null,
      updatedBy: req.user?.id ?? null,
    })
  }

  await logActivity({ userId: req.user?.id, module: 'documents', action: 'created', entityType: 'document', entityId: document.id, ipAddress: req.ip })
  res.status(201).json({ data: publicDocument(document) })
}

export const patch: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const id = document.id
  const body = { ...req.body }
  requireNonEmptyString(body, 'siteAddress', 'siteAddress is required')
  validatePmDates(body)

  await documents.update(id, {
    documentTypeId: body.documentTypeId as number | string | null,
    projectManagerName: typeof body.projectManagerName === 'string' ? body.projectManagerName.trim() : null,
    customerName: typeof body.customerName === 'string' ? body.customerName.trim() : null,
    uploadedBy: req.user?.id ?? null,
  })
  await pmProjects.updateByDocumentId({
    documentId: Number(id),
    projectsName: typeof body.projectName === 'string' ? body.projectName.trim() : null,
    projectDescription: typeof body.description === 'string' ? body.description.trim() : null,
    siteAddress: typeof body.siteAddress === 'string' ? body.siteAddress.trim() : null,
    siteLat: body.latitude as number | string | null,
    siteLon: body.longitude as number | string | null,
    plannedStartDate: typeof body.plannedStartDate === 'string' ? body.plannedStartDate : null,
    plannedEndDate: typeof body.plannedEndDate === 'string' ? body.plannedEndDate : null,
    updatedBy: req.user?.id ?? null,
  })
  const data = await documents.findById(id)
  if (!data) throw new Error('Updated document could not be loaded')
  await logActivity({ userId: req.user?.id, module: 'documents', action: 'updated', entityType: 'document', entityId: data.id, ipAddress: req.ip })
  res.json({ data: publicDocument(data) })
}

export const destroy: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const id = document.id
  if (!await documents.trash(id, req.user?.id ?? null)) return res.status(404).json({ message: 'Document not found' })
  await logActivity({ userId: req.user?.id, module: 'trash', action: 'trashed', entityType: 'document', entityId: id, ipAddress: req.ip })
  res.status(204).end()
}

export const restore: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Deleted document not found' })
  const id = document.id
  if (!await documents.restore(id)) return res.status(404).json({ message: 'Deleted document not found' })
  await logActivity({ userId: req.user?.id, module: 'trash', action: 'restored', entityType: 'document', entityId: id, ipAddress: req.ip })
  const restored = await documents.findById(id)
  res.json({ data: restored ? publicDocument(restored) : null })
}

export const updateProjectStatus: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const id = document.id
  const allowedStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const
  const status = allowedStatuses.find((value) => value === req.body?.status)
  if (!status) throw httpError(400, 'Invalid project status')
  if (!await pmProjects.updateStatusByDocumentId(id, status, req.user?.id ?? null)) {
    return res.status(404).json({ message: 'PM project not found' })
  }
  await logActivity({ userId: req.user?.id, module: 'documents', action: `project_status_${status}`, entityType: 'document', entityId: id, ipAddress: req.ip })
  const updated = await documents.findById(id)
  res.json({ data: updated ? publicDocument(updated) : null })
}

export const equipmentIndex: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  res.json({ data: await pmDetails.findAllByDocumentId(document.id) })
}

export const equipmentStore: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const documentId = document.id
  const body = { ...req.body } as Record<string, unknown>
  requireNonEmptyString(body, 'equipmentName', 'equipmentName is required')

  const rawOperatorIds = Array.isArray(body.operatorIds) ? body.operatorIds : []
  const operatorIds = rawOperatorIds.map(Number)
  if (operatorIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw httpError(400, 'operatorIds must contain valid user IDs')
  }
  if (operatorIds.length > 3 || new Set(operatorIds).size !== operatorIds.length) {
    throw httpError(400, 'operatorIds must contain no more than 3 unique users')
  }

  const data = await pmDetails.create({
    documentId,
    equipmentName: String(body.equipmentName).trim(),
    equipmentModel: typeof body.equipmentModel === 'string' && body.equipmentModel.trim() ? body.equipmentModel.trim() : null,
    faultSymptom: typeof body.faultSymptom === 'string' && body.faultSymptom.trim() ? body.faultSymptom.trim() : null,
    remarks: typeof body.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null,
    operatorIds,
    userId: req.user?.id ?? null,
  })
  if (!data) return res.status(404).json({ message: 'PM project not found' })

  await logActivity({ userId: req.user?.id, module: 'documents', action: 'equipment_created', entityType: 'documents_pm_detail', entityId: data.id, ipAddress: req.ip })
  res.status(201).json({ data })
}

export const equipmentPatch: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const documentId = document.id
  const equipmentId = routeParam(req.params.equipmentId)
  const body = { ...req.body } as Record<string, unknown>
  requireNonEmptyString(body, 'equipmentName', 'equipmentName is required')
  const data = await pmDetails.update(documentId, equipmentId, {
    equipmentName: String(body.equipmentName).trim(),
    equipmentModel: typeof body.equipmentModel === 'string' && body.equipmentModel.trim() ? body.equipmentModel.trim() : null,
    faultSymptom: typeof body.faultSymptom === 'string' && body.faultSymptom.trim() ? body.faultSymptom.trim() : null,
    remarks: typeof body.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null,
    userId: req.user?.id ?? null,
  })
  if (!data) return res.status(404).json({ message: 'Equipment not found' })
  await logActivity({ userId: req.user?.id, module: 'documents', action: 'equipment_updated', entityType: 'documents_pm_detail', entityId: equipmentId, ipAddress: req.ip })
  res.json({ data })
}

export const equipmentItemsIndex: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const documentId = document.id
  const equipmentId = routeParam(req.params.equipmentId)
  const data = await pmDetails.findItems(documentId, equipmentId)
  res.json({ data })
}

export const equipmentItemsSave: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const documentId = document.id
  const equipmentId = routeParam(req.params.equipmentId)
  const allowedSections = new Set(['cause', 'action', 'result'])
  if (!Array.isArray(req.body?.items)) throw httpError(400, 'items is required')
  const items = req.body.items.map((item: Record<string, unknown>) => ({
    section: String(item.section ?? ''),
    itemNo: Number(item.itemNo),
    itemContent: typeof item.itemContent === 'string' && item.itemContent.trim() ? item.itemContent.trim() : null,
  }))
  if (items.some((item: { section: string; itemNo: number }) => !allowedSections.has(item.section) || !Number.isInteger(item.itemNo) || item.itemNo < 1 || item.itemNo > 255)) {
    throw httpError(400, 'Invalid equipment detail item')
  }
  const keys = items.map((item: { section: string; itemNo: number }) => `${item.section}:${item.itemNo}`)
  if (new Set(keys).size !== keys.length) throw httpError(400, 'Duplicate equipment detail item')
  const rawOperatorIds = Array.isArray(req.body?.operatorIds) ? req.body.operatorIds : []
  const operatorIds = rawOperatorIds.map(Number)
  if (operatorIds.some((id: number) => !Number.isInteger(id) || id <= 0) || operatorIds.length > 3 || new Set(operatorIds).size !== operatorIds.length) {
    throw httpError(400, 'operatorIds must contain no more than 3 unique user IDs')
  }
  const allowedStatusModes = ['automatic', 'on_hold', 'waiting_parts'] as const
  const statusMode = allowedStatusModes.find((value) => value === req.body?.statusMode)
  if (!statusMode) throw httpError(400, 'statusMode must be automatic, on_hold, or waiting_parts')
  const data = await pmDetails.saveItems(documentId, equipmentId, items, operatorIds, statusMode, req.user?.id ?? null)
  if (!data) return res.status(404).json({ message: 'Equipment not found' })
  await logActivity({ userId: req.user?.id, module: 'documents', action: 'equipment_details_updated', entityType: 'documents_pm_detail', entityId: equipmentId, ipAddress: req.ip })
  res.json({ data, equipment: await pmDetails.findById(Number(equipmentId)) })
}

export const equipmentImagesStore: RequestHandler = async (req, res) => {
  const equipmentId = routeParam(req.params.equipmentId)
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>
  const referenceFiles = files.referenceImages ?? []
  const beforeFiles = files.beforeImages ?? []
  const afterFiles = files.afterImages ?? []
  if (!referenceFiles.length && !beforeFiles.length && !afterFiles.length) throw httpError(400, 'At least one image is required')
  const uploadedFiles = [...referenceFiles, ...beforeFiles, ...afterFiles]
  try {
    const document = await documentFromRoute(req.params.encryptedId)
    if (!document) {
      await Promise.allSettled(uploadedFiles.map((file) => unlink(file.path)))
      return res.status(404).json({ message: 'Document not found' })
    }
    const documentId = document.id
    const data = await pmDetails.attachImages(documentId, equipmentId, referenceFiles, beforeFiles, afterFiles, req.user?.id ?? null)
    if (!data) {
      await Promise.allSettled(uploadedFiles.map((file) => unlink(file.path)))
      return res.status(404).json({ message: 'Equipment not found' })
    }
    res.status(201).json({ data, equipment: await pmDetails.findById(Number(equipmentId)) })
  } catch (error) {
    await Promise.allSettled(uploadedFiles.map((file) => unlink(file.path)))
    throw error
  }
}

export const equipmentImageShow: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const image = await pmDetails.findImage(document.id, routeParam(req.params.equipmentId), routeParam(req.params.uploadId))
  if (!image) return res.status(404).json({ message: 'Image not found' })
  res.type(image.mimeType).sendFile(image.storagePath, { root: equipmentStorageDirectory })
}

export const equipmentImageDestroy: RequestHandler = async (req, res) => {
  const document = await documentFromRoute(req.params.encryptedId)
  if (!document) return res.status(404).json({ message: 'Document not found' })
  const documentId = document.id
  const equipmentId = routeParam(req.params.equipmentId)
  const uploadId = routeParam(req.params.uploadId)
  const deleted = await pmDetails.softDeleteImage(documentId, equipmentId, uploadId, req.user?.id ?? null)
  if (deleted === null) return res.status(404).json({ message: 'Equipment not found' })
  if (!deleted) return res.status(404).json({ message: 'Image not found' })
  await logActivity({ userId: req.user?.id, module: 'documents', action: 'equipment_image_deleted', entityType: 'documents_pm_detail_upload', entityId: uploadId, ipAddress: req.ip })
  res.json({ equipment: await pmDetails.findById(Number(equipmentId)) })
}
