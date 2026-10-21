import type { Connection } from 'mysql2/promise'

// โมดูลสิทธิ์ "กำหนดสิทธิ์ในการยื่นเอกสาร (Flow)" — แยกจาก documents_policy
// ให้ HR Div. มองเห็นหน้านี้ใน sidebar (การแก้ไขฝั่ง API ยังจำกัดที่ admin)
export async function up(connection: Connection) {
  await connection.execute(
    `INSERT INTO permission_modules (name, icon_name, sort_order, is_active)
     SELECT 'documents_flow_rules', 'FaRoute',
            COALESCE(MAX(sort_order), 0) + 1, 1
       FROM permission_modules
      ON DUPLICATE KEY UPDATE
        icon_name = VALUES(icon_name),
        is_active = 1, deleted_at = NULL`,
  )
  await connection.execute(
    `INSERT IGNORE INTO department_modules SELECT d.id, m.id FROM departments d CROSS JOIN permission_modules m
     WHERE d.name = 'HR Div.' AND m.name = 'documents_flow_rules'
       AND d.deleted_at IS NULL AND m.deleted_at IS NULL`,
  )
}
