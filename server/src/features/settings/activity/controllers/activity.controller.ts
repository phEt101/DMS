import { findActivityLogs } from '../repositories/activity.repository.js'
import type { RequestHandler } from 'express'

export const index: RequestHandler = async (req, res) => {
  const requestedPage = Number.parseInt(String(req.query.page ?? ''), 10)
  const requestedLimit = Number.parseInt(String(req.query.limit ?? ''), 10)
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 10
  const result = await findActivityLogs(page, limit)

  res.json({
    data: result.rows,
    meta: { page, limit, total: result.total },
  })
}
