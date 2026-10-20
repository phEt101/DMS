import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import { requireAnyDepartmentModule, requireDepartmentModule, requirePermission } from '../../../../auth/middleware/require-authorization.middleware.js'
import * as controller from '../controllers/permissions.controller.js'

export const permissionsRouter = Router()
permissionsRouter.get('/', requireAnyDepartmentModule('permissions', 'roles'), asyncHandler(controller.index))
permissionsRouter.post('/', requireDepartmentModule('permissions'), requirePermission('เพิ่มสิทธิ์'), asyncHandler(controller.store))
permissionsRouter.patch('/:id', requireDepartmentModule('permissions'), requirePermission('แก้ไขสิทธิ์'), asyncHandler(controller.patch))
permissionsRouter.delete('/:id', requireDepartmentModule('permissions'), requirePermission('ลบสิทธิ์'), asyncHandler(controller.destroy))
