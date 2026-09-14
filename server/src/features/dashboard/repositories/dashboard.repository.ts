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
      COALESCE((
        SELECT SUM(upload.file_size)
        FROM pm_equipment_uploads upload
        INNER JOIN pm_equipment equipment ON equipment.id = upload.pm_equipment_id AND equipment.is_deleted = 0
        INNER JOIN pm_projects pm ON pm.id = equipment.pm_project_id AND pm.is_deleted = 0
        INNER JOIN projects project ON project.id = pm.project_id AND project.deleted_at IS NULL
        WHERE upload.is_deleted = 0
      ), 0) AS storageBytes
    FROM projects
  `)
  return rows[0]
}
