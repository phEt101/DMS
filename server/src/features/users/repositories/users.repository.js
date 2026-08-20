import { db } from '../../../config/database.js'

export async function findFirstActive() {
  const [rows] = await db.query(
    'SELECT id, email, display_name AS displayName, role, is_active AS isActive, created_at AS createdAt FROM users WHERE is_active = 1 ORDER BY id LIMIT 1',
  )
  return rows[0] ?? null
}
