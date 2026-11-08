import type { Connection, RowDataPacket } from 'mysql2/promise'

const DOCUMENT_PERMISSIONS: Array<[string, string]> = [
  ['ยกเลิกเอกสาร', 'documents'],
  ['ส่งออกสมุดบันทึกการลา', 'documents_ledger'],
  ['ดูรายงานออกนอกสถานที่', 'report'],
  ['เพิ่มข้อมูลพนักงาน', 'documents_employees'],
  ['แก้ไขข้อมูลพนักงาน', 'documents_employees'],
  ['กำหนดขั้นตอนการยื่นเอกสาร', 'documents_flow_rules'],
  ['จัดการการแจ้งเตือน', 'documents_notifications'],
  ['จัดการสลิปเงินเดือน', 'documents_payslips'],
]

export async function up(connection: Connection) {
  const moduleNames = [...new Set(DOCUMENT_PERMISSIONS.map(([, moduleName]) => moduleName))]
  const [moduleRows] = await connection.query<(RowDataPacket & { id: number; name: string })[]>(
    `SELECT id, name FROM permission_modules
      WHERE deleted_at IS NULL AND name IN (${moduleNames.map(() => '?').join(',')})`,
    moduleNames,
  )
  const moduleIds = new Map(moduleRows.map((row) => [row.name, row.id]))
  const missingModules = moduleNames.filter((moduleName) => !moduleIds.has(moduleName))
  if (missingModules.length > 0) throw new Error(`Missing document permission modules: ${missingModules.join(', ')}`)

  const permissionRows = DOCUMENT_PERMISSIONS.map(([name, moduleName]) => [name, moduleIds.get(moduleName)!, 1])
  await connection.query(
    `INSERT INTO permissions (name, module_id, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE module_id = VALUES(module_id), is_active = 1, deleted_at = NULL`,
    [permissionRows],
  )

  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT roles.id, permissions.id
       FROM roles
       CROSS JOIN permissions
       JOIN permission_modules ON permission_modules.id = permissions.module_id
      WHERE roles.deleted_at IS NULL
        AND permissions.deleted_at IS NULL
        AND permissions.is_active = 1
        AND (
          roles.name = 'admin'
          OR (permissions.name = 'พิจารณาเอกสาร' AND roles.name = 'executive')
          OR (permissions.name IN ('ดูรายงานออกนอกสถานที่') AND roles.name IN ('manager', 'executive'))
          OR (permissions.name IN ('จัดการการแจ้งเตือน') AND roles.name IN ('user', 'manager', 'executive'))
          OR (permissions.name IN ('ยกเลิกเอกสาร', 'ส่งออกสมุดบันทึกการลา') AND roles.name IN ('user', 'manager', 'executive'))
        )
        AND (
          (permissions.name = 'ยกเลิกเอกสาร' AND permission_modules.name = 'documents')
          OR (permissions.name = 'ดูรายงานออกนอกสถานที่' AND permission_modules.name = 'report')
          OR (permissions.name = 'ส่งออกสมุดบันทึกการลา' AND permission_modules.name = 'documents_ledger')
          OR (permissions.name = 'จัดการการแจ้งเตือน' AND permission_modules.name = 'documents_notifications')
          OR (permissions.name IN ('เพิ่มข้อมูลพนักงาน', 'แก้ไขข้อมูลพนักงาน') AND permission_modules.name = 'documents_employees')
          OR (permissions.name = 'กำหนดขั้นตอนการยื่นเอกสาร' AND permission_modules.name = 'documents_flow_rules')
          OR (permissions.name = 'จัดการสลิปเงินเดือน' AND permission_modules.name = 'documents_payslips')
          OR (permissions.name = 'พิจารณาเอกสาร' AND permission_modules.name = 'documents_pending')
        )`,
  )

  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT users.role_id, permissions.id
       FROM users
       JOIN departments ON departments.id = users.department_id
         AND departments.name = 'HR Div.' AND departments.deleted_at IS NULL
       JOIN permissions ON permissions.name IN (
         'ยกเลิกเอกสาร', 'เพิ่มข้อมูลพนักงาน', 'แก้ไขข้อมูลพนักงาน', 'กำหนดขั้นตอนการยื่นเอกสาร',
         'จัดการการแจ้งเตือน', 'จัดการสลิปเงินเดือน', 'ดูรายงานออกนอกสถานที่',
         'ส่งออกสมุดบันทึกการลา'
       ) AND permissions.deleted_at IS NULL AND permissions.is_active = 1
      WHERE users.deleted_at IS NULL`,
  )

  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT DISTINCT users.department_id, permission_modules.id
       FROM users
       JOIN roles ON roles.id = users.role_id AND roles.name = 'executive' AND roles.deleted_at IS NULL
       JOIN role_permissions ON role_permissions.role_id = roles.id
       JOIN permissions ON permissions.id = role_permissions.permission_id
         AND permissions.name = 'พิจารณาเอกสาร' AND permissions.deleted_at IS NULL
       JOIN permission_modules ON permission_modules.name = 'documents_pending' AND permission_modules.deleted_at IS NULL
      WHERE users.department_id IS NOT NULL AND users.deleted_at IS NULL`,
  )
}
