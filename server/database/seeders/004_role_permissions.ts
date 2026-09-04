import type { Connection, RowDataPacket } from 'mysql2/promise'
import { rolePermissions } from './access-control-data.js'

export async function up(connection: Connection) {
  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const [roleRows] = await connection.execute<(RowDataPacket & { id: number })[]>(
      'SELECT id FROM roles WHERE name = ? LIMIT 1',
      [roleName],
    )
    const roleId = roleRows[0]?.id
    if (!roleId) throw new Error(`Role ${roleName} was not seeded`)

    for (const permissionName of permissionNames) {
      await connection.execute(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT ?, id FROM permissions WHERE name = ? AND deleted_at IS NULL`,
        [roleId, permissionName],
      )
    }
  }
}
