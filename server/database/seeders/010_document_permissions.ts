import type { Connection } from 'mysql2/promise'
import { permissionModules, permissions, rolePermissions } from './access-control-data.js'

const viewDocumentPermission = 'เข้าถึงเมนูเอกสาร'

export async function up(connection: Connection) {
  const moduleIndex = permissionModules.findIndex(([name]) => name === 'documents')
  const documentModule = permissionModules[moduleIndex]
  if (!documentModule) throw new Error('The documents permission module is missing from access-control-data')

  await connection.execute(
    `INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       icon_name = VALUES(icon_name), sort_order = VALUES(sort_order),
       is_active = 1, deleted_at = NULL`,
    [documentModule[0], documentModule[1], moduleIndex + 1],
  )

  const documentPermission = permissions.find(([name, module]) => name === viewDocumentPermission && module === 'documents')
  if (!documentPermission) throw new Error('The document menu permission is missing from access-control-data')

  await connection.execute(
    `INSERT INTO permissions (name, module_id)
     SELECT ?, id FROM permission_modules WHERE name = 'documents' AND deleted_at IS NULL
     ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL`,
    [documentPermission[0]],
  )

  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    if (!permissionNames.includes(viewDocumentPermission)) continue
    await connection.execute(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id)
       SELECT roles.id, permissions.id
       FROM roles CROSS JOIN permissions
       WHERE roles.name = ? AND permissions.name = ?
         AND roles.deleted_at IS NULL AND permissions.deleted_at IS NULL`,
      [roleName, viewDocumentPermission],
    )
  }
}
