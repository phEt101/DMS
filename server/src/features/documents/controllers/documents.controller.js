import * as documents from '../repositories/documents.repository.js'
import { logActivity } from '../../activity/repositories/activity.repository.js'

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) && number > 0 ? Math.min(number, maximum) : fallback
}

function requireTitle(body) {
  if (typeof body.title !== 'string' || !body.title.trim()) {
    const error = new Error('title is required')
    error.status = 400
    throw error
  }
}

export async function index(req, res) {
  const page = positiveInteger(req.query.page, 1)
  const limit = positiveInteger(req.query.limit, 50, 100)
  const data = await documents.findAll({ search: req.query.search?.trim(), limit, offset: (page - 1) * limit })
  res.json({ data, pagination: { page, limit } })
}

export async function trashIndex(req, res) {
  const data = await documents.findAll({ deleted: true })
  res.json({ data })
}

export async function show(req, res) {
  const data = await documents.findById(req.params.id)
  if (!data) return res.status(404).json({ message: 'Document not found' })
  res.json({ data })
}

export async function store(req, res) {
  requireTitle(req.body)
  const data = await documents.create({ ...req.body, title: req.body.title.trim() })
  await logActivity({ userId: req.body.uploadedBy, action: 'created', entityType: 'document', entityId: data.id })
  res.status(201).json({ data })
}

export async function patch(req, res) {
  if ('title' in req.body) requireTitle(req.body)
  if (!await documents.findById(req.params.id)) return res.status(404).json({ message: 'Document not found' })
  const data = await documents.update(req.params.id, req.body)
  await logActivity({ action: 'updated', entityType: 'document', entityId: data.id })
  res.json({ data })
}

export async function destroy(req, res) {
  if (!await documents.trash(req.params.id)) return res.status(404).json({ message: 'Document not found' })
  await logActivity({ action: 'trashed', entityType: 'document', entityId: req.params.id })
  res.status(204).end()
}

export async function restore(req, res) {
  if (!await documents.restore(req.params.id)) return res.status(404).json({ message: 'Deleted document not found' })
  await logActivity({ action: 'restored', entityType: 'document', entityId: req.params.id })
  res.json({ data: await documents.findById(req.params.id) })
}
