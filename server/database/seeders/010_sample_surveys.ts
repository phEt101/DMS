import type { Connection } from 'mysql2/promise'

export async function up(connection: Connection) {
  const rows = [
    ['SV-2026-000001', '2026-10-01', 'ตัวอย่างโครงการ A', 5, 'survey_by_sale', 'draft', 'ตัวอย่างแบบร่าง', null, null],
    ['SV-2026-000002', '2026-10-02', 'ตัวอย่างโครงการ B', 3, 'survey_by_sale_service', 'submitted', 'ตัวอย่างส่งแล้ว', null, '2026-10-02 10:30:00'],
  ]

  await connection.query(
    `INSERT INTO surveys (survey_no, survey_date, project_name, floors, visit_type, status, notes, surveyed_by, submitted_at)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       survey_date = VALUES(survey_date),
       project_name = VALUES(project_name),
       floors = VALUES(floors),
       visit_type = VALUES(visit_type),
       status = VALUES(status),
       notes = VALUES(notes),
       surveyed_by = VALUES(surveyed_by),
       submitted_at = VALUES(submitted_at)`,
    [rows],
  )
}
