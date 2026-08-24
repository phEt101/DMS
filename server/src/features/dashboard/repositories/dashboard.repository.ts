import { db } from '../../../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

export interface DashboardSummary extends RowDataPacket {
  total: number
  active: number
  trash: number
  storageBytes: number
}

export async function getSummary() {
  const [rows] = await db.query<DashboardSummary[]>(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(deleted_at IS NULL), 0) AS active,
      COALESCE(SUM(deleted_at IS NOT NULL), 0) AS trash,
      COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN file_size ELSE 0 END), 0) AS storageBytes
    FROM documents
  `)
  return rows[0]
}
