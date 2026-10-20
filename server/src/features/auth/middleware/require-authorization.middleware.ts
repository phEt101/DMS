import type { RequestHandler } from 'express'

import { httpError } from '../../../middleware/errors.js'

function isAdmin(roleName: string | undefined) {
  return roleName?.trim().toLowerCase() === 'admin'
}

export function requireAnyDepartmentModule(...moduleNames: string[]): RequestHandler {
  const allowedModules = new Set(moduleNames)

  return (req, _res, next) => {
    if (!req.user) throw httpError(401, 'Authentication required')
    if (isAdmin(req.user.role.name)) return next()

    const allowed = req.user.departmentModules.some((moduleName) => allowedModules.has(moduleName))
    if (!allowed) throw httpError(403, 'ไม่มีสิทธิ์เข้าถึงโมดูลนี้')

    next()
  }
}

export function requireDepartmentModule(moduleName: string): RequestHandler {
  return requireAnyDepartmentModule(moduleName)
}

export function requirePermission(permissionName: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw httpError(401, 'Authentication required')

    const allowed = req.user.permissions.some((permission) => permission.name === permissionName)
    if (!allowed) throw httpError(403, 'ไม่มีสิทธิ์ดำเนินการนี้')

    next()
  }
}
