import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/projects.controller.js'
import { equipmentImagesUpload } from '../middleware/equipment-images.middleware.js'

export const projectsRouter = Router()

projectsRouter.get('/', asyncHandler(controller.index))
projectsRouter.get('/trash', asyncHandler(controller.trashIndex))
projectsRouter.get('/:encryptedId', asyncHandler(controller.show))
projectsRouter.post('/', asyncHandler(controller.store))
projectsRouter.patch('/:encryptedId', asyncHandler(controller.patch))
projectsRouter.delete('/:encryptedId', asyncHandler(controller.destroy))
projectsRouter.post('/:encryptedId/restore', asyncHandler(controller.restore))
projectsRouter.patch('/:encryptedId/project-status', asyncHandler(controller.updateProjectStatus))
projectsRouter.get('/:encryptedId/equipment', asyncHandler(controller.equipmentIndex))
projectsRouter.post('/:encryptedId/equipment', asyncHandler(controller.equipmentStore))
projectsRouter.patch('/:encryptedId/equipment/:equipmentId', asyncHandler(controller.equipmentPatch))
projectsRouter.get('/:encryptedId/equipment/:equipmentId/work-details', asyncHandler(controller.equipmentWorkDetailsIndex))
projectsRouter.put('/:encryptedId/equipment/:equipmentId/work-details', asyncHandler(controller.equipmentWorkDetailsSave))
projectsRouter.post('/:encryptedId/equipment/:equipmentId/images', equipmentImagesUpload, asyncHandler(controller.equipmentImagesStore))
projectsRouter.get('/:encryptedId/equipment/:equipmentId/images/:uploadId', asyncHandler(controller.equipmentImageShow))
projectsRouter.delete('/:encryptedId/equipment/:equipmentId/images/:uploadId', asyncHandler(controller.equipmentImageDestroy))
