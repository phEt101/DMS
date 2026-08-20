import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { index } from '../controllers/activity.controller.js'

export const activityRouter = Router()

activityRouter.get('/', asyncHandler(index))
