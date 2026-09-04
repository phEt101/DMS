import type { Connection } from 'mysql2/promise'
import { permissions } from './access-control-data.js'

export async function up(connection: Connection) {
  for (const [name, module] of permissions) {
    await connection.execute(
      `INSERT INTO permissions (name, module_id)
       SELECT ?, id FROM permission_modules WHERE name = ? AND deleted_at IS NULL
       ON DUPLICATE KEY UPDATE name = VALUES(name), module_id = VALUES(module_id)`,
      [name, module],
    )
  }
}
