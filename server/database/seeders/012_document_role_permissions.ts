import type { Connection } from 'mysql2/promise'

// สิทธิ์เอกสารตาม flow:
//   admin    : ทุกสิทธิ์
//   manager  : ยื่น + พิจารณา (อนุมัติขั้น manager)
//   HR Div.  (manager/user ของแผนก HR) : ยื่น + พิจารณา (อนุมัติขั้น HR)
//   executive: ยื่น (อนุมัติขั้น executive ด้วย role ไม่ใช่ permission)
//   user     : ยื่น
const DOCUMENT_PERMISSIONS = ['เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร', 'พิจารณาเอกสาร', 'จัดการนโยบายการลา']

export async function up(connection: Connection) {
  const [roleRows] = await connection.query<any[]>(
    `SELECT id, name FROM roles WHERE deleted_at IS NULL`,
  )
  const roleId = new Map<string, number>((roleRows as any[]).map((row) => [String(row.name), Number(row.id)]))
  const [permissionRows] = await connection.query<any[]>(
    `SELECT id, name FROM permissions WHERE module_id = (SELECT id FROM permission_modules WHERE name = 'documents' LIMIT 1) AND deleted_at IS NULL`,
  )
  const permissionId = new Map<string, number>((permissionRows as any[]).map((row) => [String(row.name), Number(row.id)]))

  const grant = async (roleName: string, permissionNames: string[]) => {
    const rid = roleId.get(roleName)
    if (!rid) return
    for (const name of permissionNames) {
      const pid = permissionId.get(name)
      if (!pid) continue
      await connection.execute(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [rid, pid],
      )
    }
  }

  await grant('admin', DOCUMENT_PERMISSIONS)
  await grant('manager', ['เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร', 'พิจารณาเอกสาร'])
  await grant('executive', ['เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร'])
  await grant('user', ['เข้าถึงเมนูเอกสาร', 'ยื่นเอกสาร'])

  // ผู้ใช้แผนก HR Div. (ทุก role) ได้สิทธิ์พิจารณาเอกสาร — HR อนุมัติขั้น HR ใครอนุมัติก็ได้
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT u.role_id, p.id
       FROM users u
       JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
       JOIN permissions p ON p.name = 'พิจารณาเอกสาร' AND p.deleted_at IS NULL
      WHERE u.deleted_at IS NULL`,
  )
}
