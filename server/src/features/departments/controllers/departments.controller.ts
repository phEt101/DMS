import type { RequestHandler } from 'express'
import { httpError } from '../../../middleware/errors.js'
import * as departments from '../repositories/departments.repository.js'
import type { DepartmentInput } from '../repositories/departments.repository.js'

function id(value: string | string[] | undefined) {
  if (typeof value !== 'string') throw httpError(400, 'Invalid department id')
  return value
}

function validate(body: unknown, partial = false): DepartmentInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Request body must be an object')
  const input = body as Record<string, unknown>
  const output: DepartmentInput = {}
  if (!partial || Object.hasOwn(input, 'name')) {
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name || name.length > 150) throw httpError(400, 'Valid department name is required')
    output.name = name
  }
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

export const index: RequestHandler = async (_req, res) => res.json({ data: await departments.findAll() })

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<DepartmentInput>
  if (await departments.findDuplicate(input.name)) throw httpError(409, 'Department name already exists')
  res.status(201).json({ data: await departments.create(input) })
}

export const patch: RequestHandler = async (req, res) => {
  const departmentId = id(req.params.id)
  const current = await departments.findById(departmentId)
  if (!current) throw httpError(404, 'Department not found')
  const input = validate(req.body, true)
  if (await departments.findDuplicate(input.name ?? current.name, departmentId)) throw httpError(409, 'Department name already exists')
  res.json({ data: await departments.update(departmentId, input) })
}

export const destroy: RequestHandler = async (req, res) => {
  if (!(await departments.softDelete(id(req.params.id)))) throw httpError(404, 'Department not found')
  res.status(204).end()
}
