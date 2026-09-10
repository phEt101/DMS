import * as documentTypes from '../repositories/document-types.repository.js'
import type { RequestHandler } from 'express'

export const index: RequestHandler = async (_req, res) => {
  const data = await documentTypes.getActiveTypes()
  res.json({ data })
}
