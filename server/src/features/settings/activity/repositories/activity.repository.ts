import { db } from '../../../../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

interface ActivityInput {
  userId?: number | null
  module: string
  action: string
  entityType: string
  entityId?: number | string | null
  details?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logActivity({
  userId = null,
  module,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
}: ActivityInput) {
  await db.execute(
    `INSERT INTO activity_logs (
      user_id,
      module,
      action,
      entity_type,
      entity_id,
      details,
      ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      module,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress,
    ],
  )
}

interface ActivityLogRow extends RowDataPacket {
  id: number
  module: string | null
  action: string
  entityType: string
  entityId: number | null
  details: string | null
  ipAddress: string | null
  createdAt: Date
  userName: string | null
  userEmail: string | null
}

interface ActivityCountRow extends RowDataPacket {
  total: number
}

const activityEntries = `
  SELECT
    a.id AS id,
    0 AS source,
    a.module AS module,
    a.action AS action,
    a.entity_type AS entityType,
    a.entity_id AS entityId,
    a.details AS details,
    a.ip_address AS ipAddress,
    a.created_at AS createdAt,
    a.user_id AS userId
  FROM activity_logs a
  UNION ALL
  SELECT
    s.id,
    1,
    'survey',
    s.action,
    'survey',
    s.survey_id,
    s.details,
    s.ip_address,
    s.created_at,
    s.user_id
  FROM survey_logs s
`

interface SurveyLogInput {
  surveyId: number | null
  surveyNo?: string | null
  projectName?: string | null
  userId?: number | null
  action: 'created' | 'updated' | 'deleted'
  details?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logSurveyActivity(i: SurveyLogInput) {
  await db.execute(
    `INSERT INTO survey_logs (survey_id, survey_no, project_name, user_id, action, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      i.surveyId,
      i.surveyNo ?? null,
      i.projectName ?? null,
      i.userId ?? null,
      i.action,
      i.details ? JSON.stringify(i.details) : null,
      i.ipAddress ?? null,
    ],
  )
}
export type ActivityLogFilters = {
  search?: string
  module?: string
  action?: string
  from?: string
  to?: string
}

export async function findActivityLogs(page: number, limit: number, filters: ActivityLogFilters = {}) {
  const offset = (page - 1) * limit
  const where: string[] = []
  const params: unknown[] = []
  if (filters.search) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)')
    const like = `%${filters.search}%`
    params.push(like, like)
  }
  if (filters.module) { where.push('x.module = ?'); params.push(filters.module) }
  if (filters.action) { where.push('x.action = ?'); params.push(filters.action) }
  if (filters.from) { where.push('x.createdAt >= ?'); params.push(`${filters.from} 00:00:00`) }
  if (filters.to) { where.push('x.createdAt <= ?'); params.push(`${filters.to} 23:59:59`) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [rows] = await db.query<ActivityLogRow[]>(
    `SELECT x.id, x.module, x.action, x.entityType, x.entityId, x.details,
            x.ipAddress, x.createdAt, x.surveyNo, x.projectName,
            u.name AS userName, u.email AS userEmail
     FROM (
       SELECT a.id, a.user_id, a.module, a.action, a.entity_type AS entityType,
              a.entity_id AS entityId, a.details, a.ip_address AS ipAddress,
              a.created_at AS createdAt, NULL AS surveyNo, NULL AS projectName
       FROM activity_logs a
       UNION ALL
       SELECT l.id, l.user_id, 'surveys', l.action, 'survey',
              l.survey_id, l.details, l.ip_address,
              l.created_at, l.survey_no, l.project_name
       FROM survey_logs l
     ) x
     LEFT JOIN users u ON u.id = x.user_id
     ${whereSql}
     ORDER BY x.createdAt DESC, x.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  const [countRows] = await db.query<ActivityCountRow[]>(
    `SELECT COUNT(*) AS total FROM (
       SELECT a.id, a.user_id, a.module, a.action, a.created_at FROM activity_logs a
       UNION ALL
       SELECT l.id, l.user_id, 'surveys', l.action, l.created_at FROM survey_logs l
     ) x
     LEFT JOIN users u ON u.id = x.user_id
     ${whereSql}`,
    params,
  )

  return {
    rows: rows.map(({ details, surveyNo, projectName, ...row }: any) => {
      const parsed = parseDetails(details) ?? {}
      return {
        ...row,
        details: surveyNo || projectName
          ? { name: projectName ?? null, surveyNo: surveyNo ?? null, ...parsed }
          : (Object.keys(parsed).length ? parsed : null),
      }
    }),
    total: Number(countRows[0]?.total ?? 0),
  }
}

function parseDetails(details: string | null): Record<string, unknown> | null {
  if (!details) return null

  try {
    const parsed: unknown = JSON.parse(details)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}
