import { findActivityLogs, type ActivityLogFilters } from '../repositories/activity.repository.js'
import type { RequestHandler } from 'express'

export const index: RequestHandler = async (req, res) => {
  const requestedPage = Number.parseInt(String(req.query.page ?? ''), 10)
  const requestedLimit = Number.parseInt(String(req.query.limit ?? ''), 10)
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 10
  const filters: ActivityLogFilters = {
    search: String(req.query.search ?? '').trim() || undefined,
    module: String(req.query.module ?? '').trim() || undefined,
    action: String(req.query.action ?? '').trim() || undefined,
    from: /^[\d]{4}-[\d]{2}-[\d]{2}$/.test(String(req.query.from ?? '')) ? String(req.query.from) : undefined,
    to: /^[\d]{4}-[\d]{2}-[\d]{2}$/.test(String(req.query.to ?? '')) ? String(req.query.to) : undefined,
  }
  const result = await findActivityLogs(page, limit, filters)

  res.json({
    data: result.rows,
    meta: { page, limit, total: result.total },
  })
}
