import type { Connection, RowDataPacket } from 'mysql2/promise'

const roles: Array<readonly [string, string]> = [
  ['admin', 'Full system access'],
  ['manager', 'Manage documents and view reports'],
  ['user', 'Create and manage assigned documents'],
  ['viewer', 'Read-only access'],
]

const permissions: Array<readonly [string, string]> = [
  ['View dashboard', 'dashboard'],
  ['View documents', 'documents'],
  ['Create documents', 'documents'],
  ['Update documents', 'documents'],
  ['Delete documents', 'documents'],
  ['Restore documents', 'documents'],
  ['View reports', 'reports'],
  ['View users', 'users'],
  ['Create users', 'users'],
  ['Update users', 'users'],
  ['Delete users', 'users'],
  ['Manage roles and permissions', 'roles'],
  ['Manage departments', 'departments'],
  ['View activity logs', 'activity_logs'],
]

const departments = [
  'IT / System',
  'Project Management',
  'Field Service',
  'Management',
]

const rolePermissions: Record<string, readonly string[]> = {
  admin: permissions.map(([name]) => name),
  manager: [
    'View dashboard', 'View documents', 'Create documents', 'Update documents',
    'Delete documents', 'Restore documents', 'View reports', 'View activity logs',
  ],
  user: ['View dashboard', 'View documents', 'Create documents', 'Update documents'],
  viewer: ['View dashboard', 'View documents'],
}

export async function up(connection: Connection) {
  for (const [name, description] of roles) {
    await connection.execute(
      `INSERT INTO roles (name, description, is_system, is_active)
       VALUES (?, ?, 1, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), description = VALUES(description),
         is_system = 1, is_active = 1, deleted_at = NULL`,
      [name, description],
    )
  }

  for (const name of departments) {
    await connection.execute(
      `INSERT INTO departments (name, is_active) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
      [name],
    )
  }

  for (const [name, module] of permissions) {
    await connection.execute(
      `INSERT INTO permissions (name, module)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), module = VALUES(module)`,
      [name, module],
    )
  }

  for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
    const [roleRows] = await connection.execute<(RowDataPacket & { id: number })[]>('SELECT id FROM roles WHERE name = ? LIMIT 1', [roleName])
    const roleId = roleRows[0]?.id
    if (!roleId) throw new Error(`Role ${roleName} was not seeded`)

    for (const permissionName of permissionNames) {
      await connection.execute(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT ?, id FROM permissions WHERE name = ?`,
        [roleId, permissionName],
      )
    }
  }
}
