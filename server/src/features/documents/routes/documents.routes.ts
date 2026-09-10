import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/documents.controller.js'
import { equipmentImagesUpload } from '../middleware/equipment-images.middleware.js'

export const documentsRouter = Router()

documentsRouter.get('/', asyncHandler(controller.index))
documentsRouter.get('/trash', asyncHandler(controller.trashIndex))
documentsRouter.get('/:id', asyncHandler(controller.show))
documentsRouter.post('/', asyncHandler(controller.store))
documentsRouter.patch('/:id', asyncHandler(controller.patch))
documentsRouter.delete('/:id', asyncHandler(controller.destroy))
documentsRouter.post('/:id/restore', asyncHandler(controller.restore))
documentsRouter.patch('/:id/project-status', asyncHandler(controller.updateProjectStatus))
documentsRouter.get('/:id/equipment', asyncHandler(controller.equipmentIndex))
documentsRouter.post('/:id/equipment', asyncHandler(controller.equipmentStore))
documentsRouter.get('/:id/equipment/:equipmentId/items', asyncHandler(controller.equipmentItemsIndex))
documentsRouter.put('/:id/equipment/:equipmentId/items', asyncHandler(controller.equipmentItemsSave))
documentsRouter.post('/:id/equipment/:equipmentId/images', equipmentImagesUpload, asyncHandler(controller.equipmentImagesStore))
documentsRouter.get('/:id/equipment/:equipmentId/images/:uploadId', asyncHandler(controller.equipmentImageShow))
