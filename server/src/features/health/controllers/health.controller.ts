import { db } from '../../../config/database.js'
import type { RequestHandler } from 'express'

export const show: RequestHandler = async (_req, res) => {
  await db.query('SELECT 1')
  res.json({ status: 'ok' })
}
