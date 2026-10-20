import type { Connection } from 'mysql2/promise'

const seedTypes: Array<{ name: string; slug: string; departmentId: number | null }> = [
  { name: 'โครงการ PM', slug: 'pm', departmentId: null },
]

export async function up(connection: Connection) {
  await connection.query(
    `INSERT INTO project_types (name, slug, department_id, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       slug = VALUES(slug),
       department_id = VALUES(department_id),
       is_active = 1,
       deleted_at = NULL`,
    [seedTypes.map(({ name, slug, departmentId }) => [name, slug, departmentId, 1])],
  )
}
