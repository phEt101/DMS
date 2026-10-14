import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/documents.controller.js'
import { documentUpload } from '../middleware/document-upload.middleware.js'

export const documentsRouter = Router()
documentsRouter.get('/', asyncHandler(controller.index))
documentsRouter.post('/', documentUpload.single('file'), asyncHandler(controller.store))
documentsRouter.get('/:id/file', asyncHandler(controller.file))
documentsRouter.patch('/:id/review', asyncHandler(controller.review))
documentsRouter.delete('/:id', asyncHandler(controller.destroy))
