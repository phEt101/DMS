import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { requireDepartmentModule } from '../../auth/middleware/require-authorization.middleware.js'
import * as controller from '../controllers/announcements.controller.js'
import { announcementUpload, announcementUploadErrorHandler } from '../middleware/announcement-upload.middleware.js'

export const announcementsRouter = Router()

announcementsRouter.use(requireDepartmentModule('announcements'))
announcementsRouter.get('/unread-count', asyncHandler(controller.unreadCount))
announcementsRouter.get('/notifications', asyncHandler(controller.notifications))
announcementsRouter.get('/', asyncHandler(controller.index))
announcementsRouter.post('/', announcementUpload.array('files', 8), announcementUploadErrorHandler, asyncHandler(controller.store))
announcementsRouter.post('/read-all', asyncHandler(controller.readAllNotifications))
announcementsRouter.post('/:id/read', asyncHandler(controller.markRead))
announcementsRouter.post('/:id/publish', asyncHandler(controller.publish))
announcementsRouter.get('/:id/files/:fileId', asyncHandler(controller.file))
announcementsRouter.delete('/:id/permanent', asyncHandler(controller.permanentlyDelete))
announcementsRouter.delete('/:id', asyncHandler(controller.archive))
