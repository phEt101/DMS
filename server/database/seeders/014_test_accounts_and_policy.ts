import bcrypt from 'bcryptjs'
import type { Connection } from 'mysql2/promise'

// บัญชีทดสอบ flow การอนุมัติเอกสาร (1 บัญชีต่อ 1 role/แผนก):
//   testuser@boswell.co.th      user       IT Div.  (มี manager = testmanager)
//   testmanager@boswell.co.th   manager    IT Div.
//   testhr@boswell.co.th        manager    HR Div.  (เห็นเป็น HR เพราะอยู่แผนก HR Div.)
//   testexecutive@boswell.co.th executive  Managing Director
// รหัสผ่าน: SEED_DEFAULT_PASSWORD (เหมือนบัญชีอื่น)

const testUsers = [
  { email: 'testuser@boswell.co.th', name: 'Test User', firstName: 'Test', lastName: 'User', role: 'user', department: 'IT Div.', position: 'พนักงานทดสอบ', managerEmail: 'testmanager@boswell.co.th' },
  { email: 'testmanager@boswell.co.th', name: 'Test Manager', firstName: 'Test', lastName: 'Manager', role: 'manager', department: 'IT Div.', position: 'ผู้จัดการแผนกทดสอบ', managerEmail: null },
  { email: 'testhr@boswell.co.th', name: 'Test HR', firstName: 'Test', lastName: 'HR', role: 'manager', department: 'HR Div.', position: 'HR ทดสอบ', managerEmail: null },
  { email: 'testexecutive@boswell.co.th', name: 'Test Executive', firstName: 'Test', lastName: 'Executive', role: 'executive', department: 'Managing Director', position: 'ผู้ประกอบการทดสอบ', managerEmail: null },
]

export async function up(connection: Connection) {
  const initialCredential = process.env.SEED_DEFAULT_PASSWORD
  if (!initialCredential) throw new Error('SEED_DEFAULT_PASSWORD is required to seed users')
  const hash = await bcrypt.hash(initialCredential, 12)

  // สิทธิ์เอกสาร (กันลืม seed หลัก): สร้าง permission ถ้ายังไม่มี แล้ว grant ตาม flow
  await connection.execute(
    `INSERT INTO permissions (name, module_id)
     SELECT perms.permission_name, permission_modules.id
     FROM permission_modules
     CROSS JOIN (
       SELECT 'ยื่นเอกสาร' AS permission_name
       UNION ALL SELECT 'พิจารณาเอกสาร'
       UNION ALL SELECT 'จัดการนโยบายการลา'
     ) AS perms
     WHERE permission_modules.name = 'documents' AND permission_modules.deleted_at IS NULL
     ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
  )
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
     JOIN permission_modules m ON m.id = p.module_id AND m.name = 'documents'
     WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND p.is_active = 1
       AND ((r.name = 'admin' AND p.name IN ('เข้าถึงเมนูเอกสาร','ยื่นเอกสาร','พิจารณาเอกสาร','จัดการนโยบายการลา'))
         OR (r.name = 'manager' AND p.name IN ('เข้าถึงเมนูเอกสาร','ยื่นเอกสาร','พิจารณาเอกสาร'))
         OR (r.name IN ('executive','user') AND p.name IN ('เข้าถึงเมนูเอกสาร','ยื่นเอกสาร')))`,
  )
  // ผู้ใช้แผนก HR Div. ทุกคนได้สิทธิ์พิจารณาเอกสาร
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT u.role_id, p.id FROM users u
     JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
     JOIN permissions p ON p.name = 'พิจารณาเอกสาร' AND p.deleted_at IS NULL
     WHERE u.deleted_at IS NULL`,
  )

  // นโยบายการลาเริ่มต้น (ปี 2569) — HR/admin แก้ไขเพิ่มเติมได้จากหน้านโยบาย
  await connection.execute(
    `INSERT INTO leave_policies (company_id, policy_year, year_start, year_end, is_active)
     SELECT 1, 2569, '2025-11-26', '2026-11-25', 1
     WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE company_id = 1 AND policy_year = 2569)`,
  )

  
  for (const user of testUsers) {
    const [rows] = await connection.execute<
      import('mysql2/promise').RowDataPacket[]
    >(
      `SELECT u.id,
              (SELECT id FROM users WHERE email = ? LIMIT 1) AS manager_id
         FROM users u
        WHERE u.email = ?
        LIMIT 1`,
      [user.managerEmail ?? '', user.email],
    )

    const existing = rows[0] as
      | { id: number; manager_id?: number | null }
      | undefined

    const roleIdSub = `(SELECT id FROM roles WHERE name = '${user.role}' LIMIT 1)`
    const depIdSub = `(SELECT id FROM departments WHERE name = '${user.department}' LIMIT 1)`

    let userId: number

    if (existing?.id) {
      userId = existing.id

      await connection.execute(
        `UPDATE users
            SET name = ?, first_name = ?, last_name = ?, password_hash = ?,
                role_id = ${roleIdSub}, department_id = ${depIdSub},
                company_id = 1, is_active = 1, deleted_at = NULL
          WHERE id = ?`,
        [user.name, user.firstName, user.lastName, hash, userId],
      )
    } else {
      const [result] = await connection.execute<
        import('mysql2/promise').ResultSetHeader
      >(
        `INSERT INTO users
          (email, password_hash, name, first_name, last_name,
           role_id, department_id, company_id, is_active)
         VALUES (?, ?, ?, ?, ?, ${roleIdSub}, ${depIdSub}, 1, 1)`,
        [user.email, hash, user.name, user.firstName, user.lastName],
      )

      userId = result.insertId
    }

    // โควตาการลา (employees)
    // ใช้ userId ซึ่งได้มาทั้งจาก UPDATE และ INSERT
    const managerId = existing?.manager_id ?? null

    await connection.execute(
      `INSERT INTO employees
        (user_id, employee_code, position, manager_user_id,
         sick_leave_days, personal_leave_days, vacation_leave_days,
         email_notifications_enabled)
       VALUES (?, CONCAT('BCG-', LPAD(?, 4, '0')), ?, ?, 30, 3, 6, 1)
       ON DUPLICATE KEY UPDATE
         position = VALUES(position),
         manager_user_id = VALUES(manager_user_id),
         sick_leave_days = VALUES(sick_leave_days),
         personal_leave_days = VALUES(personal_leave_days),
         vacation_leave_days = VALUES(vacation_leave_days)`,
      [userId, userId, user.position, managerId],
    )
  }
}