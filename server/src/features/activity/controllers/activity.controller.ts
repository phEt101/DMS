import { findRecent } from '../repositories/activity.repository.js'
import type { RequestHandler } from 'express'

export const index: RequestHandler = async (req, res) => {
  const requested = Number.parseInt(String(req.query.limit ?? ''), 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 200) : 100
  res.json({ data: await findRecent(limit) })
}
