import { Router } from 'express'
import { asyncHandler } from '../../../middleware/errors.js'
import * as controller from '../controllers/employee-requests.controller.js'
import { medicalCertificateUpload } from '../middleware/medical-certificate-upload.middleware.js'


// mount ที่ /api/employee-requests (เช่นเดียวกับ documentsRouter)
export const employeeRequestsRouter = Router()

// เส้นทางคงที่ต้องมาก่อน '/:id'
employeeRequestsRouter.get('/policy', asyncHandler(controller.policy))
employeeRequestsRouter.put('/policy', asyncHandler(controller.updatePolicy))
employeeRequestsRouter.get('/flow-rules', asyncHandler(controller.flowRules))
employeeRequestsRouter.put('/flow-rules', asyncHandler(controller.updateFlowRules))
employeeRequestsRouter.get('/outing-report', asyncHandler(controller.outingReport))
employeeRequestsRouter.get('/signature/me', asyncHandler(controller.mySignature))
employeeRequestsRouter.put('/signature/me', asyncHandler(controller.saveMySignature))
employeeRequestsRouter.get('/people', asyncHandler(controller.people))
employeeRequestsRouter.get('/notifications', asyncHandler(controller.notifications))
employeeRequestsRouter.get('/badges', asyncHandler(controller.badges))
employeeRequestsRouter.get('/summary', asyncHandler(controller.dashboardSummary))
employeeRequestsRouter.post('/notifications/read', asyncHandler(controller.readNotifications))
employeeRequestsRouter.post('/validate', asyncHandler(controller.validate))
employeeRequestsRouter.get('/:id/medical-certificate', asyncHandler(controller.medicalCertificate))

employeeRequestsRouter.get('/', asyncHandler(controller.index))
employeeRequestsRouter.post('/', medicalCertificateUpload.single('medicalCertificate'), asyncHandler(controller.store))
employeeRequestsRouter.get('/:id', asyncHandler(controller.show))
employeeRequestsRouter.post('/:id/approve', asyncHandler(controller.approve))
employeeRequestsRouter.post('/:id/reject', asyncHandler(controller.reject))
employeeRequestsRouter.post('/:id/cancel', asyncHandler(controller.cancel))