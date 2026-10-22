import type { Connection } from 'mysql2/promise'

// ให้แผนก HR Div. จัดการหน้าจอพนักงาน (Employees) ได้ทั้งหมด
// — เปิดโมดูล users ให้แผนก (เข้าหน้าจอ / โหลดรายชื่อพนักงานได้)
// — ให้สิทธิ์ สร้างผู้ใช้งาน / แก้ไขผู้ใช้งาน แก่บทบาทของผู้ใช้ที่สังกัดแผนก HR Div.
// รันซ้ำได้ปลอดภัย (NOT EXISTS / INSERT IGNORE)
export async function up(connection: Connection) {
  await connection.execute(
    `INSERT INTO department_modules (department_id, module_id)
     SELECT d.id, m.id
       FROM departments d
       JOIN permission_modules m ON m.name = 'users'
      WHERE d.name = 'HR Div.'
        AND d.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM department_modules dm
           WHERE dm.department_id = d.id AND dm.module_id = m.id
        )`,
  )
  await connection.execute(
    `INSERT IGNORE INTO role_permissions (role_id, permission_id)
     SELECT DISTINCT u.role_id, p.id
       FROM users u
       JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
       JOIN permissions p ON p.name IN ('สร้างผู้ใช้งาน', 'แก้ไขผู้ใช้งาน') AND p.deleted_at IS NULL
      WHERE u.deleted_at IS NULL`,
  )
}
