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

export async function findActivityLogs(page: number, limit: number) {
  const offset = (page - 1) * limit
  const [rows] = await db.query<ActivityLogRow[]>(
    `SELECT
       a.id,
       a.module,
       a.action,
       a.entity_type AS entityType,
       a.entity_id AS entityId,
       a.details,
       a.ip_address AS ipAddress,
       a.created_at AS createdAt,
       u.name AS userName,
       u.email AS userEmail
     FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  )
  const [countRows] = await db.query<ActivityCountRow[]>(
    'SELECT COUNT(*) AS total FROM activity_logs',
  )

  return {
    rows: rows.map(({ details, ...row }) => ({
      ...row,
      details: parseDetails(details),
    })),
    total: countRows[0]?.total ?? 0,
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
