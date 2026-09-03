import type { RequestHandler } from 'express'
import { httpError } from '../../../../../middleware/errors.js'
import * as departments from '../repositories/departments.repository.js'
import type { DepartmentInput } from '../repositories/departments.repository.js'
import { logActivity } from '../../../activity/repositories/activity.repository.js'

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
  if (Object.hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw httpError(400, 'isActive must be a boolean')
    output.isActive = input.isActive
  } else if (!partial) output.isActive = true
  return output
}

function collectChanges(current: departments.DepartmentRow, input: DepartmentInput) {
  return (Object.keys(input) as Array<keyof DepartmentInput>).flatMap((field) => {
    const from = field === 'isActive' ? Boolean(current[field]) : current[field]
    const to = field === 'isActive' ? Boolean(input[field]) : input[field]
    return from === to ? [] : [{ field, from, to }]
  })
}

export const index: RequestHandler = async (_req, res) => res.json({ data: await departments.findAll() })

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<DepartmentInput>
  if (await departments.findDuplicate(input.name)) throw httpError(409, 'Department name already exists')
  const data = await departments.create(input)
  await logActivity({
    userId: req.user?.id,
    module: 'departments',
    action: 'created',
    entityType: 'department',
    entityId: data?.id,
    details: { name: data?.name ?? input.name },
    ipAddress: req.ip,
  })
  res.status(201).json({ data })
}

export const patch: RequestHandler = async (req, res) => {
  const departmentId = id(req.params.id)
  const current = await departments.findById(departmentId)
  if (!current) throw httpError(404, 'Department not found')
  const input = validate(req.body, true)
  const changes = collectChanges(current, input)
  if (await departments.findDuplicate(input.name ?? current.name, departmentId)) throw httpError(409, 'Department name already exists')
  const data = await departments.update(departmentId, input)
  if (changes.length > 0) {
    const statusChange = changes.length === 1 && changes[0]?.field === 'isActive'
    await logActivity({
      userId: req.user?.id,
      module: 'departments',
      action: statusChange
        ? Boolean(changes[0]?.to) ? 'activated' : 'deactivated'
        : 'updated',
      entityType: 'department',
      entityId: departmentId,
      details: { name: data?.name ?? current.name, changes },
      ipAddress: req.ip,
    })
  }
  res.json({ data })
}

export const destroy: RequestHandler = async (req, res) => {
  const departmentId = id(req.params.id)
  const current = await departments.findById(departmentId)
  if (!current || !(await departments.softDelete(departmentId))) throw httpError(404, 'Department not found')
  await logActivity({
    userId: req.user?.id,
    module: 'departments',
    action: 'deleted',
    entityType: 'department',
    entityId: departmentId,
    details: { name: current.name },
    ipAddress: req.ip,
  })
  res.status(204).end()
}
