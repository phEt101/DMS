import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/documents.controller.js'

export const documentsRouter = Router()

documentsRouter.get('/', asyncHandler(controller.index))
documentsRouter.get('/trash', asyncHandler(controller.trashIndex))
documentsRouter.get('/:id', asyncHandler(controller.show))
documentsRouter.post('/', asyncHandler(controller.store))
documentsRouter.patch('/:id', asyncHandler(controller.patch))
documentsRouter.delete('/:id', asyncHandler(controller.destroy))
documentsRouter.post('/:id/restore', asyncHandler(controller.restore))
