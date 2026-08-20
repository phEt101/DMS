import { db } from '../../../config/database.js'

export async function getSummary() {
  const [rows] = await db.query(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(deleted_at IS NULL), 0) AS active,
      COALESCE(SUM(deleted_at IS NOT NULL), 0) AS trash,
      COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN file_size ELSE 0 END), 0) AS storageBytes
    FROM documents
  `)
  return rows[0]
}
