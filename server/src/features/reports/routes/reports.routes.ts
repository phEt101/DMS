import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { documents } from '../controllers/reports.controller.js'

export const reportsRouter = Router()

reportsRouter.get('/documents', asyncHandler(documents))
