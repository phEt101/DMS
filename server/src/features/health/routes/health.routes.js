import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { show } from '../controllers/health.controller.js'

export const healthRouter = Router()

healthRouter.get('/', asyncHandler(show))
