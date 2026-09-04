import type { Connection } from 'mysql2/promise'
import { departments } from './access-control-data.js'

export async function up(connection: Connection) {
  for (const name of departments) {
    await connection.execute(
      `INSERT INTO departments (name, is_active)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
      [name],
    )
  }

  await connection.execute(
    `UPDATE users
     SET department_id = (SELECT id FROM departments WHERE name = 'IT / System' LIMIT 1)
     WHERE email = 'admin@boswell.com'`,
  )

  await connection.execute(
    `UPDATE departments
     SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
     WHERE name = 'General'
       AND NOT EXISTS (SELECT 1 FROM users WHERE users.department_id = departments.id)`,
  )
}
