import { getDocumentActivity } from '../repositories/reports.repository.js'
import type { RequestHandler } from 'express'

export const documents: RequestHandler = async (_req, res) => {
  res.json({ data: await getDocumentActivity() })
}
