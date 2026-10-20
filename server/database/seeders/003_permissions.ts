import type { Connection, RowDataPacket } from 'mysql2/promise'
import { permissions } from './access-control-data.js'

export async function up(connection: Connection) {
  const [moduleRows] = await connection.query<(RowDataPacket & { id: number; name: string })[]>(
    'SELECT id, name FROM permission_modules WHERE deleted_at IS NULL',
  )
  const moduleIds = new Map(moduleRows.map((row) => [row.name, row.id]))
  const rows = permissions.map(([name, moduleName]) => {
    const moduleId = moduleIds.get(moduleName)
    if (!moduleId) throw new Error(`Permission module ${moduleName} was not seeded`)
    return [name, moduleId]
  })

  await connection.query(
    `INSERT INTO permissions (name, module_id)
     VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), module_id = VALUES(module_id), is_active = 1, deleted_at = NULL`,
    [rows],
  )
}
