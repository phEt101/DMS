import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/departments.controller.js'

export const departmentsRouter = Router()
departmentsRouter.get('/', asyncHandler(controller.index))
departmentsRouter.post('/', asyncHandler(controller.store))
departmentsRouter.patch('/:id', asyncHandler(controller.patch))
departmentsRouter.delete('/:id', asyncHandler(controller.destroy))
