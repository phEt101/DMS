import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { projects } from '../controllers/reports.controller.js'

export const reportsRouter = Router()

reportsRouter.get('/projects', asyncHandler(projects))
