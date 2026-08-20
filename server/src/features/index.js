import { Router } from 'express'
import { activityRouter } from './activity/routes/activity.routes.js'
import { dashboardRouter } from './dashboard/routes/dashboard.routes.js'
import { documentsRouter } from './documents/routes/documents.routes.js'
import { healthRouter } from './health/routes/health.routes.js'
import { reportsRouter } from './reports/routes/reports.routes.js'
import { usersRouter } from './users/routes/users.routes.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/documents', documentsRouter)
apiRouter.use('/users', usersRouter)
apiRouter.use('/activity', activityRouter)
apiRouter.use('/dashboard', dashboardRouter)
apiRouter.use('/reports', reportsRouter)
