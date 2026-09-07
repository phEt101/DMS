import cookieParser from "cookie-parser";
import express from 'express'
import helmet from 'helmet'

import { env } from "./config/env.js";
import { apiRouter } from './features/index.js'
import { errorHandler, notFound } from './middleware/errors.js'

export const app = express()
app.set('trust proxy', env.trustProxy)
app.disable('x-powered-by')
app.use(helmet())
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use('/boswell-api/v1', apiRouter)
app.use(notFound)
app.use(errorHandler)
