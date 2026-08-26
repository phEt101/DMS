import * as documents from '../repositories/documents.repository.js'
import { logActivity } from '../../settings/activity/repositories/activity.repository.js'
import { httpError } from '../../../middleware/errors.js'
import type { RequestHandler } from 'express'

function positiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) && number > 0 ? Math.min(number, maximum) : fallback
}

function requireTitle(body: Record<string, unknown>) {
  if (typeof body.title !== 'string' || !body.title.trim()) {
    throw httpError(400, 'title is required')
  }
}

function routeParam(value: string | string[] | undefined): string {
  if (typeof value !== 'string') throw httpError(400, 'Invalid route parameter')
  return value
}

export const index: RequestHandler = async (req, res) => {
  const page = positiveInteger(req.query.page, 1)
  const limit = positiveInteger(req.query.limit, 50, 100)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const data = await documents.findAll({ search, limit, offset: (page - 1) * limit })
  res.json({ data, pagination: { page, limit } })
}

export const trashIndex: RequestHandler = async (_req, res) => {
  const data = await documents.findAll({ deleted: true })
  res.json({ data })
}

export const show: RequestHandler = async (req, res) => {
  const data = await documents.findById(routeParam(req.params.id))
  if (!data) return res.status(404).json({ message: 'Document not found' })
  res.json({ data })
}

export const store: RequestHandler = async (req, res) => {
  requireTitle(req.body)
  const data = await documents.create({ ...req.body, title: req.body.title.trim() })
  await logActivity({ userId: req.body.uploadedBy, action: 'created', entityType: 'document', entityId: data.id })
  res.status(201).json({ data })
}

export const patch: RequestHandler = async (req, res) => {
  if ('title' in req.body) requireTitle(req.body)
  const id = routeParam(req.params.id)
  if (!await documents.findById(id)) return res.status(404).json({ message: 'Document not found' })
  const data = await documents.update(id, req.body)
  if (!data) throw new Error('Updated document could not be loaded')
  await logActivity({ action: 'updated', entityType: 'document', entityId: data.id })
  res.json({ data })
}

export const destroy: RequestHandler = async (req, res) => {
  const id = routeParam(req.params.id)
  if (!await documents.trash(id)) return res.status(404).json({ message: 'Document not found' })
  await logActivity({ action: 'trashed', entityType: 'document', entityId: id })
  res.status(204).end()
}

export const restore: RequestHandler = async (req, res) => {
  const id = routeParam(req.params.id)
  if (!await documents.restore(id)) return res.status(404).json({ message: 'Deleted document not found' })
  await logActivity({ action: 'restored', entityType: 'document', entityId: id })
  res.json({ data: await documents.findById(id) })
}
