import type { Connection, RowDataPacket } from 'mysql2/promise'

// สิทธิ์เอกสารตาม flow:
//   admin    : ทุกสิทธิ์
//   manager  : ยื่น + พิจารณา (อนุมัติขั้น manager)
//   HR Div.  (ทุก role ในแผนก HR) : ยื่น + พิจารณา + จัดการนโยบายการลา
//   executive: ยื่น (อนุมัติขั้น executive ด้วย role ไม่ใช่ permission)
//   user     : ยื่น
const DOCUMENT_PERMISSIONS = ['ยื่นเอกสาร', 'พิจารณาเอกสาร', 'จัดการนโยบายการลา']

export async function up(connection: Connection) {
  const [roleRows] = await connection.query<(RowDataPacket & { id: number; name: string })[]>(
    `SELECT id, name FROM roles WHERE deleted_at IS NULL`,
  )
  const roleId = new Map(roleRows.map((row) => [row.name, row.id]))
  const [permissionRows] = await connection.query<(RowDataPacket & { id: number; name: string })[]>(
    `SELECT id, name FROM permissions WHERE module_id IN (SELECT id FROM permission_modules WHERE name IN ('documents', 'documents_pending', 'documents_policy')) AND deleted_at IS NULL`,
  )
  const permissionId = new Map(permissionRows.map((row) => [row.name, row.id]))

  const grants: Array<[string, string[]]> = [
    ['admin', DOCUMENT_PERMISSIONS],
    ['manager', ['ยื่นเอกสาร', 'พิจารณาเอกสาร']],
    ['executive', ['ยื่นเอกสาร']],
    ['user', ['ยื่นเอกสาร']],
  ]
  const rows = grants.flatMap(([roleName, permissionNames]) => {
    const rid = roleId.get(roleName)
    if (!rid) return []
    return permissionNames.flatMap((name) => {
      const pid = permissionId.get(name)
      return pid ? [[rid, pid]] : []
    })
  })

  if (rows.length > 0) {
    await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?', [rows])
  }

  // ผู้ใช้แผนก HR Div. (ทุก role) จัดการนโยบายและพิจารณาเอกสารได้
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT u.role_id, p.id
       FROM users u
       JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
       JOIN permissions p ON p.name IN ('พิจารณาเอกสาร', 'จัดการนโยบายการลา') AND p.deleted_at IS NULL
      WHERE u.deleted_at IS NULL`,
  )
}
