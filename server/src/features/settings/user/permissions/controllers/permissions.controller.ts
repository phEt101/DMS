import type { RequestHandler } from 'express'
import { httpError } from '../../../../../middleware/errors.js'
import * as permissions from '../repositories/permissions.repository.js'
import type { PermissionInput } from '../repositories/permissions.repository.js'

function id(value: string | string[] | undefined) {
  if (typeof value !== 'string') throw httpError(400, 'Invalid permission id')
  return value
}

function text(value: unknown, field: string, maximum: number) {
  const output = typeof value === 'string' ? value.trim() : ''
  if (!output || output.length > maximum) throw httpError(400, `Valid ${field} is required`)
  return output
}

function validate(body: unknown, partial = false): PermissionInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Request body must be an object')
  const input = body as Record<string, unknown>
  const output: PermissionInput = {}
  if (!partial || Object.hasOwn(input, 'name')) output.name = text(input.name, 'permission name', 150)
  if (!partial || Object.hasOwn(input, 'module')) output.module = text(input.module, 'module', 80).toLowerCase()
  if (Object.hasOwn(input, 'description')) {
    if (input.description !== null && typeof input.description !== 'string') throw httpError(400, 'Description must be a string')
    output.description = typeof input.description === 'string' ? input.description.trim().slice(0, 500) || null : null
  } else if (!partial) output.description = null
  if (Object.hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw httpError(400, 'isActive must be a boolean')
    output.isActive = input.isActive
  } else if (!partial) output.isActive = true
  return output
}

export const index: RequestHandler = async (_req, res) => res.json({ data: await permissions.findAll() })

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<PermissionInput>
  if (await permissions.findDuplicate(input.name, input.module)) throw httpError(409, 'Permission name already exists in this module')
  res.status(201).json({ data: await permissions.create(input) })
}

export const patch: RequestHandler = async (req, res) => {
  const permissionId = id(req.params.id)
  const current = await permissions.findById(permissionId)
  if (!current) throw httpError(404, 'Permission not found')
  const input = validate(req.body, true)
  if (await permissions.findDuplicate(input.name ?? current.name, input.module ?? current.module, permissionId)) throw httpError(409, 'Permission name already exists in this module')
  res.json({ data: await permissions.update(permissionId, input) })
}

export const destroy: RequestHandler = async (req, res) => {
  if (!(await permissions.softDelete(id(req.params.id)))) throw httpError(404, 'Permission not found')
  res.status(204).end()
}
