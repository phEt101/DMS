import { getSummary } from '../repositories/dashboard.repository.js'
import type { RequestHandler } from 'express'

export const show: RequestHandler = async (_req, res) => {
  res.json({ data: await getSummary() })
}
