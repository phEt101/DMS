import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/documents.controller.js'
import { equipmentImagesUpload } from '../middleware/equipment-images.middleware.js'

export const documentsRouter = Router()

documentsRouter.get('/', asyncHandler(controller.index))
documentsRouter.get('/trash', asyncHandler(controller.trashIndex))
documentsRouter.get('/:encryptedId', asyncHandler(controller.show))
documentsRouter.post('/', asyncHandler(controller.store))
documentsRouter.patch('/:encryptedId', asyncHandler(controller.patch))
documentsRouter.delete('/:encryptedId', asyncHandler(controller.destroy))
documentsRouter.post('/:encryptedId/restore', asyncHandler(controller.restore))
documentsRouter.patch('/:encryptedId/project-status', asyncHandler(controller.updateProjectStatus))
documentsRouter.get('/:encryptedId/equipment', asyncHandler(controller.equipmentIndex))
documentsRouter.post('/:encryptedId/equipment', asyncHandler(controller.equipmentStore))
documentsRouter.patch('/:encryptedId/equipment/:equipmentId', asyncHandler(controller.equipmentPatch))
documentsRouter.get('/:encryptedId/equipment/:equipmentId/items', asyncHandler(controller.equipmentItemsIndex))
documentsRouter.put('/:encryptedId/equipment/:equipmentId/items', asyncHandler(controller.equipmentItemsSave))
documentsRouter.post('/:encryptedId/equipment/:equipmentId/images', equipmentImagesUpload, asyncHandler(controller.equipmentImagesStore))
documentsRouter.get('/:encryptedId/equipment/:equipmentId/images/:uploadId', asyncHandler(controller.equipmentImageShow))
documentsRouter.delete('/:encryptedId/equipment/:equipmentId/images/:uploadId', asyncHandler(controller.equipmentImageDestroy))
