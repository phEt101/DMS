import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import { requireAnyDepartmentModule, requireDepartmentModule, requirePermission } from '../../../../auth/middleware/require-authorization.middleware.js'
import * as controller from '../controllers/departments.controller.js'

export const departmentsRouter = Router()
departmentsRouter.get('/', requireAnyDepartmentModule('departments', 'users'), asyncHandler(controller.index))
departmentsRouter.post('/', requireDepartmentModule('departments'), requirePermission('เพิ่มแผนก'), asyncHandler(controller.store))
departmentsRouter.patch('/:id', requireDepartmentModule('departments'), requirePermission('แก้ไขแผนก'), asyncHandler(controller.patch))
departmentsRouter.delete('/:id', requireDepartmentModule('departments'), requirePermission('ลบแผนก'), asyncHandler(controller.destroy))
