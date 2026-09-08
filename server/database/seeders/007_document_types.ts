import type { Connection } from 'mysql2/promise'

const seedTypes: Array<{ name: string; departmentId: number | null }> = [
  { name: 'เอกสารทั่วไป', departmentId: null },
  { name: 'โครงการ PM', departmentId: null },
]

export async function up(connection: Connection) {
  for (const t of seedTypes) {
    await connection.execute(
      `INSERT INTO document_types (name, department_id, is_active)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE
         department_id = ?,
         is_active = 1,
         deleted_at = NULL`,
      [t.name, t.departmentId, t.departmentId],
    )
  }
}
