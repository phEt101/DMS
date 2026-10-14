import { Router } from 'express'
import { asyncHandler } from '../../../../../middleware/errors.js'
import * as controller from '../controllers/companies.controller.js'

export const companiesRouter = Router()
companiesRouter.get('/', asyncHandler(controller.index))
companiesRouter.post('/', asyncHandler(controller.store))
companiesRouter.patch('/:id', asyncHandler(controller.patch))
companiesRouter.delete('/:id', asyncHandler(controller.destroy))
