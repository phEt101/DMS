import type { Connection } from 'mysql2/promise'
import { permissionModules } from './access-control-data.js'

export async function up(connection: Connection) {
  await connection.query(
    `INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       icon_name = VALUES(icon_name), sort_order = VALUES(sort_order),
       is_active = 1, deleted_at = NULL`,
    [permissionModules.map(([name, iconName], index) => [name, iconName, index + 1, 1])],
  )
}
