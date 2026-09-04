import type { Connection } from 'mysql2/promise'
import { permissionModules } from './access-control-data.js'

export async function up(connection: Connection) {
  for (const [index, [name, iconName]] of permissionModules.entries()) {
    await connection.execute(
      `INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         icon_name = VALUES(icon_name), sort_order = VALUES(sort_order),
         is_active = 1, deleted_at = NULL`,
      [name, iconName, index + 1],
    )
  }
}
