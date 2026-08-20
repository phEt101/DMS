import { db } from '../../../config/database.js'

export async function logActivity({ userId = null, action, entityType, entityId = null, details = null }) {
  await db.execute(
    'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [userId, action, entityType, entityId, details ? JSON.stringify(details) : null],
  )
}

export async function findRecent(limit = 100) {
  const [rows] = await db.query(
    `SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
            a.details, a.created_at AS createdAt, u.display_name AS userName
     FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT ?`,
    [limit],
  )
  return rows
}
