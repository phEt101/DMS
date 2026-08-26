import { Router } from 'express'
import { activityRouter } from './settings/activity/routes/activity.routes.js'
import { dashboardRouter } from './dashboard/routes/dashboard.routes.js'
import { documentsRouter } from './documents/routes/documents.routes.js'
import { healthRouter } from './health/routes/health.routes.js'
import { reportsRouter } from './reports/routes/reports.routes.js'
import { usersRouter } from './settings/user/users/routes/users.routes.js'
import { departmentsRouter } from './settings/user/departments/routes/departments.routes.js'
import { permissionsRouter } from './settings/user/permissions/routes/permissions.routes.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/documents', documentsRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/departments', departmentsRouter)
apiRouter.use('/permissions', permissionsRouter)
apiRouter.use('/activity', activityRouter)
apiRouter.use('/dashboard', dashboardRouter)
apiRouter.use('/reports', reportsRouter)
