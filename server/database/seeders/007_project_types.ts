import type { Connection } from 'mysql2/promise'

const seedTypes: Array<{ name: string; slug: string; departmentId: number | null }> = [
  { name: 'โครงการ PM', slug: 'pm', departmentId: null },
]

export async function up(connection: Connection) {
  for (const t of seedTypes) {
    await connection.execute(
      `INSERT INTO project_types (name, slug, department_id, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         slug = ?,
         department_id = ?,
         is_active = 1,
         deleted_at = NULL`,
      [t.name, t.slug, t.departmentId, t.slug, t.departmentId],
    )
  }
}
