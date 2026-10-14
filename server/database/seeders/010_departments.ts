import type { Connection } from 'mysql2/promise'
import { departments } from './access-control-data.js'

export async function up(connection: Connection) {
  await connection.query(
    `INSERT INTO departments (name, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
    [departments.map((name) => [name, 1])],
  )

  await connection.execute(
    `UPDATE users
     SET department_id = (SELECT id FROM departments WHERE name = 'IT Div.' LIMIT 1)
     WHERE department_id = (SELECT id FROM departments WHERE name = 'IT / System' LIMIT 1)`,
  )
  await connection.execute(
    `UPDATE projects
     SET department_id = (SELECT id FROM departments WHERE name = 'IT Div.' LIMIT 1)
     WHERE department_id = (SELECT id FROM departments WHERE name = 'IT / System' LIMIT 1)`,
  )
  await connection.execute(
    `UPDATE project_types
     SET department_id = (SELECT id FROM departments WHERE name = 'IT Div.' LIMIT 1)
     WHERE department_id = (SELECT id FROM departments WHERE name = 'IT / System' LIMIT 1)`,
  )
  await connection.execute(
    `UPDATE departments
     SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
     WHERE name = 'IT / System'`,
  )
}
