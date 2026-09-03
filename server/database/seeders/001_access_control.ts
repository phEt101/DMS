import type { Connection, RowDataPacket } from 'mysql2/promise'

const roles: Array<readonly [string, string]> = [
  ['admin', 'Full system access'],
  ['manager', 'Manage documents and view reports'],
  ['user', 'Create and manage assigned documents'],
  ['viewer', 'Read-only access'],
]

const permissions: Array<readonly [string, string]> = [
  ['ดูแดชบอร์ด', 'dashboard'],
  ['ดูเอกสาร', 'documents'],
  ['สร้างเอกสาร', 'documents'],
  ['แก้ไขเอกสาร', 'documents'],
  ['ลบเอกสาร', 'documents'],
  ['กู้คืนเอกสาร', 'trash'],
  ['ดูรายงาน', 'reports'],
  ['ดูผู้ใช้งาน', 'users'],
  ['สร้างผู้ใช้งาน', 'users'],
  ['แก้ไขผู้ใช้งาน', 'users'],
  ['ลบผู้ใช้งาน', 'users'],
  ['จัดการบทบาทและสิทธิ์', 'roles'],
  ['จัดการแผนก', 'departments'],
  ['ดูบันทึกกิจกรรม', 'activity_logs'],
]

const permissionModules = [
  'dashboard',
  'documents',
  'reports',
  'trash',
  'users',
  'roles',
  'departments',
  'activity_logs',
] as const

const departments = [
  'IT / System',
  'Project Management',
  'Field Service',
  'Management',
]

const rolePermissions: Record<string, readonly string[]> = {
  admin: permissions.map(([name]) => name),
  manager: [
    'ดูแดชบอร์ด', 'ดูเอกสาร', 'สร้างเอกสาร', 'แก้ไขเอกสาร',
    'ลบเอกสาร', 'กู้คืนเอกสาร', 'ดูรายงาน', 'ดูบันทึกกิจกรรม',
  ],
  user: ['ดูแดชบอร์ด', 'ดูเอกสาร', 'สร้างเอกสาร', 'แก้ไขเอกสาร'],
  viewer: ['ดูแดชบอร์ด', 'ดูเอกสาร'],
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

  for (const [index, name] of permissionModules.entries()) {
    const sortOrder = index + 1
    await connection.execute(
      `INSERT INTO permission_modules (name, sort_order, is_active)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = 1, deleted_at = NULL`,
      [name, sortOrder],
    )
  }

  for (const [name, module] of permissions) {
    await connection.execute(
      `INSERT INTO permissions (name, module_id)
       SELECT ?, id FROM permission_modules WHERE name = ? AND deleted_at IS NULL
       ON DUPLICATE KEY UPDATE name = VALUES(name), module_id = VALUES(module_id)`,
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
