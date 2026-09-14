import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/project-types.controller.js'

export const projectTypesRouter = Router()

projectTypesRouter.get('/', asyncHandler(controller.index))
