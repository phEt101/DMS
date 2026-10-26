import type { RequestHandler } from 'express'
import { httpError } from '../../../../../middleware/errors.js'
import * as departments from '../repositories/departments.repository.js'
import type { DepartmentInput } from '../repositories/departments.repository.js'
import { logActivity } from '../../../activity/repositories/activity.repository.js'

function id(value: string | string[] | undefined) {
  if (typeof value !== 'string') throw httpError(400, 'Invalid department id')
  return value
}

const has = (input: Record<string, unknown>, field: string) => Object.hasOwn(input, field)

function readCompanyId(value: unknown) {
  const companyId = Number(value)
  if (!Number.isSafeInteger(companyId) || companyId < 1) throw httpError(400, 'Valid company is required')
  return companyId
}

function readName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 150) throw httpError(400, 'Valid department name is required')
  return name
}

function readModuleIds(value: unknown) {
  if (!Array.isArray(value) || value.some((moduleId) => !Number.isSafeInteger(moduleId) || Number(moduleId) < 1)) {
    throw httpError(400, 'moduleIds must contain positive integers')
  }
  return [...new Set(value.map(Number))]
}

function validate(body: unknown, partial = false): DepartmentInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Request body must be an object')
  const input = body as Record<string, unknown>
  const output: DepartmentInput = {}
  if (!partial || has(input, 'companyId')) output.companyId = readCompanyId(input.companyId)
  if (!partial || has(input, 'name')) output.name = readName(input.name)
  if (has(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw httpError(400, 'isActive must be a boolean')
    output.isActive = input.isActive
  } else if (!partial) output.isActive = true
  if (has(input, 'moduleIds')) output.moduleIds = readModuleIds(input.moduleIds)
  else if (!partial) output.moduleIds = []
  return output
}

function comparableValue(field: keyof DepartmentInput, value: DepartmentInput[keyof DepartmentInput] | undefined) {
  if (field === 'isActive') return Boolean(value)
  if (field === 'moduleIds') return [...(value as number[] | undefined ?? [])].sort((left, right) => left - right).join(',')
  return value
}

function collectChanges(current: departments.DepartmentRow, input: DepartmentInput) {
  return (Object.keys(input) as Array<keyof DepartmentInput>).flatMap((field) => {
    const from = comparableValue(field, current[field])
    const to = comparableValue(field, input[field])
    return from === to ? [] : [{ field, from, to }]
  })
}

function updateAction(changes: ReturnType<typeof collectChanges>) {
  const statusChange = changes.length === 1 && changes[0]?.field === 'isActive'
  if (!statusChange) return 'updated'
  return changes[0]?.to ? 'activated' : 'deactivated'
}

export const index: RequestHandler = async (_req, res) => res.json({ data: await departments.findAll() })

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<DepartmentInput>
  if (await departments.findDuplicate(input.companyId, input.name)) throw httpError(409, 'Department name already exists in this company')
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
  if (await departments.findDuplicate(input.companyId ?? current.companyId, input.name ?? current.name, departmentId)) throw httpError(409, 'Department name already exists in this company')
  const data = await departments.update(departmentId, input)
  if (changes.length > 0) {
    await logActivity({
      userId: req.user?.id,
      module: 'departments',
      action: updateAction(changes),
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
