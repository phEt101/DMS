import * as projectTypes from '../repositories/project-types.repository.js'
import type { RequestHandler } from 'express'

export const index: RequestHandler = async (_req, res) => {
  const data = await projectTypes.getActiveTypes()
  res.json({ data })
}
