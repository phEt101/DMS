import type { Connection, RowDataPacket } from 'mysql2/promise'
import { rolePermissions } from './access-control-data.js'

export async function up(connection: Connection) {
  const [roleRows] = await connection.query<(RowDataPacket & { id: number; name: string })[]>(
    'SELECT id, name FROM roles WHERE deleted_at IS NULL',
  )
  const [permissionRows] = await connection.query<(RowDataPacket & { id: number; name: string })[]>(
    'SELECT id, name FROM permissions WHERE deleted_at IS NULL',
  )
  const roleIds = new Map(roleRows.map((row) => [row.name, row.id]))
  const permissionIds = new Map(permissionRows.map((row) => [row.name, row.id]))
  const rows = Object.entries(rolePermissions).flatMap(([roleName, permissionNames]) => {
    const roleId = roleIds.get(roleName)
    if (!roleId) throw new Error(`Role ${roleName} was not seeded`)
    return permissionNames.map((permissionName) => {
      const permissionId = permissionIds.get(permissionName)
      if (!permissionId) throw new Error(`Permission ${permissionName} was not seeded`)
      return [roleId, permissionId]
    })
  })

  if (rows.length > 0) {
    await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?', [rows])
  }
}
