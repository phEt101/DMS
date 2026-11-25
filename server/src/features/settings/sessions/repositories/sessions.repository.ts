import type { RowDataPacket } from 'mysql2/promise'

import { db } from '../../../../config/database.js'
import { avatarUrlOf } from '../../users/middleware/avatar-upload.middleware.js'
import { parseDevice, type SessionDevice } from '../services/device-parser.js'

export type PresenceStatus = 'active' | 'idle' | 'offline'
export type PresenceFilter = 'online' | 'active' | 'idle' | 'offline' | 'all'

interface SessionRow extends RowDataPacket {
  id: number
  name: string
  email: string
  avatarPath: string | null
  company: string
  department: string | null
  departmentId: number | null
  role: string
  sessionId: number | null
  ipAddress: string | null
  userAgent: string | null
  sessionStartedAt: Date | string | null
  sessionExpiresAt: Date | string | null
  lastActivityAt: Date | string | null
  activeDeviceCount: number
  presence: PresenceStatus
}

interface PresenceCountRow extends RowDataPacket {
  presence: PresenceStatus
  total: number
}

export interface SessionUser {
  id: number
  sessionId: number | null
  name: string
  email: string
  avatarUrl: string | null
  company: string
  department: string | null
  role: string
  presence: PresenceStatus
  hasSession: boolean
  device: SessionDevice | null
  ipAddress: string | null
  lastActivityAt: string | null
  sessionStartedAt: string | null
  sessionExpiresAt: string | null
  activeDeviceCount: number
}

export interface SessionFilters {
  search?: string
  departmentId?: number
  role?: string
}

export interface SessionsQuery extends SessionFilters {
  companyId: number
  status: PresenceFilter
  limit: number
  offset: number
}

export interface SessionsSummary {
  active: number
  idle: number
  offline: number
  online: number
  total: number
}

export interface SessionsFilterOptions {
  departments: Array<{ id: number; name: string }>
  roles: string[]
}

// แสดงทุก session ที่ยังใช้งานได้ เพื่อให้เห็นอุปกรณ์ที่ล็อกอินพร้อมกัน
// ถ้าไม่มี session ใช้ session ล่าสุดเป็นข้อมูลประกอบสถานะออฟไลน์
const baseSelect = `
  SELECT
    u.id AS id,
    u.name AS name,
    u.email AS email,
    u.avatar_path AS avatarPath,
    c.name AS company,
    d.name AS department,
    u.department_id AS departmentId,
    r.name AS role,
    ls.id AS sessionId,
    ls.ip_address AS ipAddress,
    ls.user_agent AS userAgent,
    ls.created_at AS sessionStartedAt,
    ls.expires_at AS sessionExpiresAt,
    COALESCE(ls.last_used_at, ls.created_at) AS lastActivityAt,
    (SELECT COUNT(*) FROM user_sessions active_session
      WHERE active_session.user_id = u.id
        AND active_session.revoked_at IS NULL
        AND active_session.expires_at > NOW()) AS activeDeviceCount,
    CASE WHEN ls.id IS NOT NULL AND ls.revoked_at IS NULL AND ls.expires_at > NOW() THEN 'active' ELSE 'offline' END AS presence
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  INNER JOIN companies c ON c.id = u.company_id AND c.is_active = 1 AND c.deleted_at IS NULL
  LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
  LEFT JOIN user_sessions ls ON (
    (ls.user_id = u.id AND ls.revoked_at IS NULL AND ls.expires_at > NOW())
    OR (ls.user_id = u.id AND NOT EXISTS (
      SELECT 1 FROM user_sessions live
      WHERE live.user_id = u.id AND live.revoked_at IS NULL AND live.expires_at > NOW()
    ) AND ls.id = (SELECT MAX(last_session.id) FROM user_sessions last_session WHERE last_session.user_id = u.id))
  )
  WHERE u.company_id = ? AND u.deleted_at IS NULL
`

function filterSql(filters: SessionFilters): { sql: string; params: Array<string | number> } {
  const clauses: string[] = []
  const params: Array<string | number> = []
  if (filters.search) {
    clauses.push('(x.name LIKE ? OR x.email LIKE ?)')
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }
  if (filters.departmentId) {
    clauses.push('x.departmentId = ?')
    params.push(filters.departmentId)
  }
  if (filters.role) {
    clauses.push('x.role = ?')
    params.push(filters.role)
  }
  return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params }
}

function statusSql(status: PresenceFilter): string {
  if (status === 'online') return " AND x.presence IN ('active', 'idle')"
  if (status === 'active' || status === 'idle' || status === 'offline') return ' AND x.presence = ?'
  return ''
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function toSessionUser(row: SessionRow): SessionUser {
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    email: row.email,
    avatarUrl: avatarUrlOf(row.avatarPath),
    company: row.company,
    department: row.department,
    role: row.role,
    presence: row.presence,
    hasSession: row.sessionId !== null,
    device: parseDevice(row.userAgent),
    ipAddress: row.ipAddress,
    lastActivityAt: toIso(row.lastActivityAt),
    sessionStartedAt: toIso(row.sessionStartedAt),
    sessionExpiresAt: toIso(row.sessionExpiresAt),
    activeDeviceCount: Number(row.activeDeviceCount),
  }
}

export async function findSessions({ companyId, status, search, departmentId, role, limit, offset }: SessionsQuery) {
  const filters = filterSql({ search, departmentId, role })
  const statusClause = statusSql(status)
  const statusParams = status === 'active' || status === 'idle' || status === 'offline' ? [status] : []
  const params = [companyId, ...filters.params, ...statusParams]

  const [rows] = await db.query<SessionRow[]>(
    `SELECT * FROM (${baseSelect}) x
      WHERE 1 = 1${filters.sql}${statusClause}
      ORDER BY FIELD(x.presence, 'active', 'idle', 'offline'), x.lastActivityAt IS NULL, x.lastActivityAt DESC, x.name ASC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  const [countRows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM (${baseSelect}) x WHERE 1 = 1${filters.sql}${statusClause}`,
    params,
  )

  return {
    rows: rows.map(toSessionUser),
    total: Number(countRows[0]?.total ?? 0),
  }
}

export async function findPresenceSummary(companyId: number, filters: SessionFilters): Promise<SessionsSummary> {
  const filter = filterSql(filters)
  const [rows] = await db.query<PresenceCountRow[]>(
    `SELECT x.presence AS presence, COUNT(*) AS total FROM (${baseSelect}) x
      WHERE 1 = 1${filter.sql}
      GROUP BY x.presence`,
    [companyId, ...filter.params],
  )

  const summary: SessionsSummary = { active: 0, idle: 0, offline: 0, online: 0, total: 0 }
  for (const row of rows) {
    if (row.presence === 'active') summary.active = Number(row.total)
    if (row.presence === 'idle') summary.idle = Number(row.total)
    if (row.presence === 'offline') summary.offline = Number(row.total)
  }
  summary.online = summary.active + summary.idle
  summary.total = summary.online + summary.offline
  return summary
}

export async function findFilterOptions(companyId: number): Promise<SessionsFilterOptions> {
  const [departmentRows] = await db.query<(RowDataPacket & { id: number; name: string })[]>(
    `SELECT id, name FROM departments WHERE company_id = ? AND deleted_at IS NULL ORDER BY name`,
    [companyId],
  )
  const [roleRows] = await db.query<(RowDataPacket & { name: string })[]>(
    `SELECT name FROM roles WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name`,
  )
  return {
    departments: departmentRows.map((row) => ({ id: Number(row.id), name: row.name })),
    roles: roleRows.map((row) => row.name),
  }
}
