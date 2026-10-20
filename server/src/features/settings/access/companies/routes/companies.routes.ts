import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import { requireAnyDepartmentModule, requireDepartmentModule, requirePermission } from '../../../../auth/middleware/require-authorization.middleware.js'
import * as controller from '../controllers/companies.controller.js'

export const companiesRouter = Router()
companiesRouter.get('/', requireAnyDepartmentModule('companies', 'departments', 'users'), asyncHandler(controller.index))
companiesRouter.post('/', requireDepartmentModule('companies'), requirePermission('เพิ่มบริษัท'), asyncHandler(controller.store))
companiesRouter.patch('/:id', requireDepartmentModule('companies'), requirePermission('แก้ไขบริษัท'), asyncHandler(controller.patch))
companiesRouter.delete('/:id', requireDepartmentModule('companies'), requirePermission('ลบบริษัท'), asyncHandler(controller.destroy))
