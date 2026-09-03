import type { RequestHandler } from 'express'
import { httpError } from '../../../../../middleware/errors.js'
import * as permissions from '../repositories/permissions.repository.js'
import type { PermissionInput } from '../repositories/permissions.repository.js'
import * as modules from "../../modules/repositories/modules.repository.js";
import { logActivity } from '../../../activity/repositories/activity.repository.js'

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
  if (!partial || Object.hasOwn(input, 'moduleId')) {
    const moduleId = Number(input.moduleId)
    if (!Number.isSafeInteger(moduleId) || moduleId <= 0) throw httpError(400, 'Valid moduleId is required')
    output.moduleId = moduleId
  }
  if (Object.hasOwn(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw httpError(400, 'isActive must be a boolean')
    output.isActive = input.isActive
  } else if (!partial) output.isActive = true
  return output
}

function collectChanges(current: permissions.PermissionRow, input: PermissionInput) {
  return (Object.keys(input) as Array<keyof PermissionInput>).flatMap((field) => {
    const from = field === 'isActive' ? Boolean(current[field]) : current[field]
    const to = field === 'isActive' ? Boolean(input[field]) : input[field]
    return from === to ? [] : [{ field, from, to }]
  })
}

export const index: RequestHandler = async (_req, res) => res.json({ data: await permissions.findAll() })

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<PermissionInput>
  if (!(await modules.exists(input.moduleId))) throw httpError(400, 'Invalid permission module')
  if (await permissions.findDuplicate(input.name, input.moduleId)) throw httpError(409, 'Permission name already exists in this module')
  const data = await permissions.create(input)
  await logActivity({
    userId: req.user?.id,
    module: 'permissions',
    action: 'created',
    entityType: 'permission',
    entityId: data?.id,
    details: { name: data?.name ?? input.name, module: data?.module },
    ipAddress: req.ip,
  })
  res.status(201).json({ data })
}

export const patch: RequestHandler = async (req, res) => {
  const permissionId = id(req.params.id)
  const current = await permissions.findById(permissionId)
  if (!current) throw httpError(404, 'Permission not found')
  const input = validate(req.body, true)
  if (input.moduleId !== undefined && !(await modules.exists(input.moduleId))) throw httpError(400, 'Invalid permission module')
  const changes = collectChanges(current, input)
  if (await permissions.findDuplicate(input.name ?? current.name, input.moduleId ?? current.moduleId, permissionId)) throw httpError(409, 'Permission name already exists in this module')
  const data = await permissions.update(permissionId, input)
  const activityChanges = changes.map((change) =>
    change.field === 'moduleId'
      ? { field: 'module', from: current.module, to: data?.module }
      : change,
  )
  if (changes.length > 0) {
    const statusChange = changes.length === 1 && changes[0]?.field === 'isActive'
    await logActivity({
      userId: req.user?.id,
      module: 'permissions',
      action: statusChange
        ? Boolean(changes[0]?.to) ? 'activated' : 'deactivated'
        : 'updated',
      entityType: 'permission',
      entityId: permissionId,
      details: { name: data?.name ?? current.name, changes: activityChanges },
      ipAddress: req.ip,
    })
  }
  res.json({ data })
}

export const destroy: RequestHandler = async (req, res) => {
  const permissionId = id(req.params.id)
  const current = await permissions.findById(permissionId)
  if (!current || !(await permissions.softDelete(permissionId))) throw httpError(404, 'Permission not found')
  await logActivity({
    userId: req.user?.id,
    module: 'permissions',
    action: 'deleted',
    entityType: 'permission',
    entityId: permissionId,
    details: { name: current.name, module: current.module },
    ipAddress: req.ip,
  })
  res.status(204).end()
}
