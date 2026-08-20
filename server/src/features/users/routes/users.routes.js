import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import { me } from '../controllers/users.controller.js'

export const usersRouter = Router()

usersRouter.get('/me', asyncHandler(me))
