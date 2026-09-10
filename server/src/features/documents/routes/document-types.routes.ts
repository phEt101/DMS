import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/document-types.controller.js'

export const documentTypesRouter = Router()

documentTypesRouter.get('/', asyncHandler(controller.index))
