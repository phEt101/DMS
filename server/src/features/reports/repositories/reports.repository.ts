import { db } from '../../../config/database.js'

export async function getProjectActivity() {
  const [rows] = await db.query(`
    SELECT DATE(project.created_at) AS date,
      COUNT(DISTINCT project.id) AS projects,
      COALESCE(SUM(upload.file_size), 0) AS bytes
    FROM projects project
    LEFT JOIN pm_projects pm ON pm.project_id = project.id AND pm.is_deleted = 0
    LEFT JOIN pm_equipment equipment ON equipment.pm_project_id = pm.id AND equipment.is_deleted = 0
    LEFT JOIN pm_equipment_uploads upload ON upload.pm_equipment_id = equipment.id AND upload.is_deleted = 0
    WHERE project.created_at >= CURRENT_DATE - INTERVAL 30 DAY
    GROUP BY DATE(project.created_at) ORDER BY date
  `)
  return rows
}
