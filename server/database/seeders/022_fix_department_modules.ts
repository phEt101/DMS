import type { Connection } from 'mysql2/promise'

// แก้ข้อมูล department_modules ที่ค้างจาก seed เดิม:
// 1) ถอดโมดูล documents_policy ออกจากแผนกที่ไม่ใช่ HR Div.
//    (เดิม seed ให้ทุกแผนกที่มีสิทธิ์ จัดการนโยบายการลา เห็นหน้านโยบายการลา — ควรเห็นเฉพาะ HR Div.)
// 2) ปัดฝุง HR Div. ให้ได้โมดูลเอกสารครบทุกหน้า (รวม พนักงาน / กำหนดสิทธิ์ในการยื่นเอกสาร)
// รันซ้ำได้ปลอดภัย
const HR_ONLY_MODULES = ['documents_policy'] as const

export async function up(connection: Connection) {
  // 1) เอา documents_policy ออกจากแผนกอื่น (คงไว้เฉพาะ HR Div. — documents_flow_rules ถูกจำกัดที่ admin อยู่แล้ว)
  await connection.execute(
    `DELETE dm FROM department_modules dm
       JOIN departments d ON d.id = dm.department_id AND d.deleted_at IS NULL
       JOIN permission_modules m ON m.id = dm.module_id AND m.deleted_at IS NULL
      WHERE m.name IN (${HR_ONLY_MODULES.map(() => '?').join(',')})
        AND NOT (d.name = 'HR Div.')`,
    [...HR_ONLY_MODULES],
  )

  // 2) HR Div. ต้องเห็นโมดูลเอกสารครบทุกหน้า
  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT d.id, m.id
       FROM departments d
       JOIN permission_modules m
         ON m.name IN ('documents','documents_pending','documents_ledger','documents_employees','documents_policy','documents_flow_rules','documents_notifications')
        AND m.deleted_at IS NULL
      WHERE d.name = 'HR Div.' AND d.deleted_at IS NULL`,
  )
}

export async function down(connection: Connection) {
  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT DISTINCT u.department_id, target.id
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       CROSS JOIN permission_modules target
      WHERE u.department_id IS NOT NULL AND u.deleted_at IS NULL AND target.deleted_at IS NULL
        AND p.name = 'จัดการนโยบายการลา' AND target.name = 'documents_policy'`,
  )
}
