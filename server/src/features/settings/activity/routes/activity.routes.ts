import { Router } from 'express'
import { asyncHandler } from '../../../../middleware/errors.js'
import { requireDepartmentModule } from '../../../auth/middleware/require-authorization.middleware.js'
import { index } from '../controllers/activity.controller.js'

export const activityRouter = Router()

activityRouter.get('/', requireDepartmentModule('activity_logs'), asyncHandler(index))
