import { Router } from 'express'

import { asyncHandler } from '../../../../middleware/errors.js'
import { requireAdminRole } from '../../../auth/middleware/require-authorization.middleware.js'
import { updateResetPasswordStatus } from '../controllers/app-settings.controller.js'

export const appSettingsRouter = Router()

// ต้องล็อกอิน (apiRouter ใช้ requireAuth อยู่แล้ว) และต้องเป็น admin เท่านั้น
appSettingsRouter.patch('/reset-password', requireAdminRole(), asyncHandler(updateResetPasswordStatus))
