import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import { requireAnyDepartmentModule, requireDepartmentModule, requirePermission } from '../../../../auth/middleware/require-authorization.middleware.js'
import * as controller from '../controllers/modules.controller.js'
export const modulesRouter = Router()
modulesRouter.get("/", requireAnyDepartmentModule("modules", "permissions", "departments"), asyncHandler(controller.index))
modulesRouter.post("/", requireDepartmentModule("modules"), requirePermission("เพิ่มโมดูล"), asyncHandler(controller.store))
modulesRouter.patch("/:id", requireDepartmentModule("modules"), requirePermission("แก้ไขโมดูล"), asyncHandler(controller.patch))
modulesRouter.delete("/:id", requireDepartmentModule("modules"), requirePermission("ลบโมดูล"), asyncHandler(controller.destroy))
