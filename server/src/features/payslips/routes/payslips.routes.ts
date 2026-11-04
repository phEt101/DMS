import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/payslips.controller.js'
import { payslipUpload, payslipUploadErrorHandler } from '../middleware/payslip-upload.middleware.js'

// mount ที่ /api/payslips (หลัง requireAuth) — เส้นทางคงที่ต้องมาก่อน '/:id'
export const payslipsRouter = Router()

payslipsRouter.get('/me', asyncHandler(controller.mine))
payslipsRouter.get('/manage', asyncHandler(controller.manageList))
payslipsRouter.post('/manage/bulk', payslipUpload.array('files'), payslipUploadErrorHandler, asyncHandler(controller.bulkUpload))
payslipsRouter.put('/manage/:userId', payslipUpload.single('file'), payslipUploadErrorHandler, asyncHandler(controller.upload))
payslipsRouter.delete('/manage/:id', asyncHandler(controller.remove))
payslipsRouter.get('/:id/file', asyncHandler(controller.file))
