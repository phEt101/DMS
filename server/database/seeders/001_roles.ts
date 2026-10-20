import type { Connection } from 'mysql2/promise'
import { roles } from './access-control-data.js'

export async function up(connection: Connection) {
  await connection.query(
    `INSERT INTO roles (name, description, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       description = VALUES(description), is_active = 1,
       deleted_at = NULL`,
    [roles.map(([name, description]) => [name, description, 1])],
  )
}
