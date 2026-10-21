import type { RequestHandler } from 'express'
import { httpError } from '../../../../../middleware/errors.js'
import * as companies from '../repositories/companies.repository.js'
import type { CompanyInput } from '../repositories/companies.repository.js'
import { logActivity } from '../../../activity/repositories/activity.repository.js'

function routeId(value: string | string[] | undefined) {
  if (typeof value !== 'string') throw httpError(400, 'Invalid company id')
  return value
}

function validate(body: unknown, partial = false): CompanyInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Request body must be an object')
  const input = body as Record<string, unknown>
  const output: CompanyInput = {}
  if (!partial || Object.hasOwn(input, 'name')) {
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name || name.length > 150) throw httpError(400, 'Valid company name is required')
    output.name = name
  }
  if (!partial || Object.hasOwn(input, 'logoUrl')) {
    const logoUrl = input.logoUrl == null || input.logoUrl === '' ? null : typeof input.logoUrl === 'string' ? input.logoUrl.trim() : undefined
    // ยอมรับ https URL หรือ path ภายใน (/boswell-api/v1/branding/...) — โลโก้ที่อัปโหลดไว้ใน server
    const internal = typeof logoUrl === 'string' && /^\/boswell-api\/v1\/branding\/[A-Za-z0-9._-]+\.(svg|png|jpe?g|webp)$/i.test(logoUrl)
    if (logoUrl === undefined || (logoUrl !== null && !internal && (logoUrl.length > 2048 || !/^https:\/\//i.test(logoUrl)))) throw httpError(400, 'Logo must be a valid https URL or internal branding path')
    output.logoUrl = logoUrl
  }
  if (Object.hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw httpError(400, 'isActive must be a boolean')
    output.isActive = input.isActive
  } else if (!partial) output.isActive = true
  return output
}

export const index: RequestHandler = async (_req, res) => res.json({ data: await companies.findAll() })

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<CompanyInput>
  if (await companies.findDuplicate(input.name)) throw httpError(409, 'Company name already exists')
  const data = await companies.create(input)
  await logActivity({ userId: req.user?.id, module: 'companies', action: 'created', entityType: 'company', entityId: data?.id, details: { name: data?.name ?? input.name }, ipAddress: req.ip })
  res.status(201).json({ data })
}

export const patch: RequestHandler = async (req, res) => {
  const companyId = routeId(req.params.id)
  const current = await companies.findById(companyId)
  if (!current) throw httpError(404, 'Company not found')
  const input = validate(req.body, true)
  if (await companies.findDuplicate(input.name ?? current.name, companyId)) throw httpError(409, 'Company name already exists')
  const data = await companies.update(companyId, input)
  await logActivity({ userId: req.user?.id, module: 'companies', action: 'updated', entityType: 'company', entityId: companyId, details: { name: data?.name ?? current.name }, ipAddress: req.ip })
  res.json({ data })
}

export const destroy: RequestHandler = async (req, res) => {
  const companyId = routeId(req.params.id)
  const current = await companies.findById(companyId)
  if (!current) throw httpError(404, 'Company not found')
  if (!(await companies.softDelete(companyId))) throw httpError(409, 'Company still has users or was already deleted')
  await logActivity({ userId: req.user?.id, module: 'companies', action: 'deleted', entityType: 'company', entityId: companyId, details: { name: current.name }, ipAddress: req.ip })
  res.status(204).end()
}
