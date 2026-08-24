import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { show } from '../controllers/dashboard.controller.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', asyncHandler(show))
