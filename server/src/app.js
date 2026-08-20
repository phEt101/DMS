import express from 'express'
import helmet from 'helmet'
import { apiRouter } from './features/index.js'
import { errorHandler, notFound } from './middleware/errors.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use('/api/v1', apiRouter)
app.use(notFound)
app.use(errorHandler)
