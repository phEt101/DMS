import { getProjectActivity } from '../repositories/reports.repository.js'
import type { RequestHandler } from 'express'

export const projects: RequestHandler = async (_req, res) => {
  res.json({ data: await getProjectActivity() })
}
