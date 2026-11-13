import { Router } from 'express'
import { asyncHandler } from '../../../../middleware/errors.js'
import { requireAdminRole } from '../../../auth/middleware/require-authorization.middleware.js'
import { index } from '../controllers/activity.controller.js'

export const activityRouter = Router()

activityRouter.get('/', requireAdminRole(), asyncHandler(index))
