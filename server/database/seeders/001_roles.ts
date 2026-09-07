import type { Connection } from 'mysql2/promise'
import { roles } from './access-control-data.js'

export async function up(connection: Connection) {
  for (const [name, description] of roles) {
    await connection.execute(
      `INSERT INTO roles (name, description, is_active)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE
         description = VALUES(description), is_active = 1,
         deleted_at = NULL`,
      [name, description],
    )
  }
}
