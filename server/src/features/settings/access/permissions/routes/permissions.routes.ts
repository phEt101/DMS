import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import * as controller from '../controllers/permissions.controller.js'

export const permissionsRouter = Router()
permissionsRouter.get('/', asyncHandler(controller.index))
permissionsRouter.post('/', asyncHandler(controller.store))
permissionsRouter.patch('/:id', asyncHandler(controller.patch))
permissionsRouter.delete('/:id', asyncHandler(controller.destroy))
