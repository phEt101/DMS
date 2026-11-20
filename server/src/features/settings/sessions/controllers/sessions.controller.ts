import type { RequestHandler } from 'express'

import { httpError } from '../../../../middleware/errors.js'
import {
  findFilterOptions,
  findPresenceSummary,
  findSessions,
  type PresenceFilter,
} from '../repositories/sessions.repository.js'

const PRESENCE_FILTERS = new Set<PresenceFilter>(['online', 'active', 'idle', 'offline', 'all'])

function positiveInteger(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function isPresenceFilter(value: unknown): value is PresenceFilter {
  return typeof value === 'string' && PRESENCE_FILTERS.has(value as PresenceFilter)
}

export const index: RequestHandler = async (req, res) => {
  const user = req.user
  if (!user) throw httpError(401, 'Authentication required')

  const page = positiveInteger(req.query.page, 1)
  const limit = positiveInteger(req.query.limit, 10, 100)
  const rawStatus = req.query.status
  const status: PresenceFilter = isPresenceFilter(rawStatus) ? rawStatus : 'online'
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 120) : ''
  const role = typeof req.query.role === 'string' && req.query.role !== 'all' ? req.query.role.trim() : ''
  const departmentId = (() => {
    const value = req.query.departmentId
    if (value === undefined || value === '' || value === 'all') return undefined
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw httpError(400, 'Invalid department filter')
    return parsed
  })()

  const companyId = user.company.id
  const [result, summary, filters] = await Promise.all([
    findSessions({ companyId, status, search, departmentId, role, limit, offset: (page - 1) * limit }),
    findPresenceSummary(companyId, { search, departmentId, role }),
    findFilterOptions(companyId),
  ])

  res.json({
    data: result.rows,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.max(Math.ceil(result.total / limit), 1),
    },
    summary,
    filters,
    generatedAt: new Date().toISOString(),
  })
}
