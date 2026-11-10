import type { Connection, RowDataPacket } from 'mysql2/promise'

export async function up(connection: Connection) {
  await connection.execute(
    `INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
     VALUES ('announcements', 'FaBullhorn', 0, 1)
     ON DUPLICATE KEY UPDATE icon_name = VALUES(icon_name), is_active = 1, deleted_at = NULL`,
  )
  await connection.execute(
    `INSERT INTO permissions (module_id, name, is_active)
     SELECT id, 'จัดการประกาศ', 1 FROM permission_modules WHERE name = 'announcements'
     ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL`,
  )
  const [permissions] = await connection.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM permissions WHERE name = 'จัดการประกาศ'
       AND module_id = (SELECT id FROM permission_modules WHERE name = 'announcements')
       AND deleted_at IS NULL AND is_active = 1`,
  )
  const permissionId = permissions[0]?.id
  if (!permissionId) throw new Error('Unable to create announcement management permission')

  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT roles.id, ?
       FROM roles
       LEFT JOIN users ON users.role_id = roles.id AND users.deleted_at IS NULL
       LEFT JOIN departments ON departments.id = users.department_id
         AND departments.name = 'HR Div.' AND departments.deleted_at IS NULL
      WHERE roles.deleted_at IS NULL
        AND (roles.name IN ('admin', 'user') OR departments.id IS NOT NULL)`,
    [permissionId],
  )
  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT departments.id, permission_modules.id
       FROM departments CROSS JOIN permission_modules
      WHERE permission_modules.name = 'announcements'
        AND departments.deleted_at IS NULL AND permission_modules.deleted_at IS NULL`,
  )
}
