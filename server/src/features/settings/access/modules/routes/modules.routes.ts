import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import * as controller from '../controllers/modules.controller.js'
export const modulesRouter = Router()
modulesRouter.get("/", asyncHandler(controller.index))
modulesRouter.post("/", asyncHandler(controller.store))
modulesRouter.patch("/:id", asyncHandler(controller.patch))
modulesRouter.delete("/:id", asyncHandler(controller.destroy))
