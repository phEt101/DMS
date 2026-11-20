import { Router } from 'express'

import { asyncHandler } from '../../../../middleware/errors.js'
import { requireAdminRole } from '../../../auth/middleware/require-authorization.middleware.js'
import { index } from '../controllers/sessions.controller.js'

export const sessionsRouter = Router()

// หน้า "ผู้ใช้งานออนไลน์" เป็นข้อมูลระดับบริษัท — จำกัดให้เฉพาะ admin
sessionsRouter.get('/', requireAdminRole(), asyncHandler(index))
