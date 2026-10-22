import type { Connection } from 'mysql2/promise'

// สิทธิ์เอกสาร + นโยบายการลาเริ่มต้น (ตัดส่วนบัญชี test accounts ออกจาก 014 เดิมแล้ว)
// - สร้าง permission เอกสารถ้ายังไม่มี แล้ว grant ตาม role
// - ผู้ใช้แผนก HR Div. ทุกคนได้สิทธิ์พิจารณาเอกสารและจัดการนโยบายการลา
// - นโยบายการลาเริ่มต้น (ปี 2026) — HR/admin แก้ไขเพิ่มเติมได้จากหน้านโยบาย

export async function up(connection: Connection) {
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
     WHERE permission_modules.deleted_at IS NULL
       AND ((permission_modules.name = 'documents' AND perms.permission_name = 'ยื่นเอกสาร')
         OR (permission_modules.name = 'documents_pending' AND perms.permission_name = 'พิจารณาเอกสาร')
         OR (permission_modules.name = 'documents_policy' AND perms.permission_name = 'จัดการนโยบายการลา'))
     ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
  )
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
     JOIN permission_modules m ON m.id = p.module_id AND m.name IN ('documents', 'documents_pending', 'documents_policy')
     WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL AND p.is_active = 1
       AND ((r.name = 'admin' AND p.name IN ('ยื่นเอกสาร','พิจารณาเอกสาร','จัดการนโยบายการลา'))
         OR (r.name = 'manager' AND p.name IN ('ยื่นเอกสาร','พิจารณาเอกสาร'))
         OR (r.name IN ('executive','user') AND p.name = 'ยื่นเอกสาร'))`,
  )
  // ผู้ใช้แผนก HR Div. ทุกคนได้สิทธิ์พิจารณาเอกสารและจัดการนโยบายการลา
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT u.role_id, p.id FROM users u
     JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
     JOIN permissions p ON p.name IN ('พิจารณาเอกสาร', 'จัดการนโยบายการลา') AND p.deleted_at IS NULL
     WHERE u.deleted_at IS NULL`,
  )

  // นโยบายการลาเริ่มต้น (ปี 2026) — HR/admin แก้ไขเพิ่มเติมได้จากหน้านโยบาย
  await connection.execute(
    `INSERT INTO leave_policies (company_id, policy_year, year_start, year_end, is_active)
     SELECT 1, 2026, '2025-11-26', '2026-11-25', 1
     FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE company_id = 1 AND policy_year = 2026)`,
  )
}
