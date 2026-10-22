import type { Connection } from 'mysql2/promise'

// ให้แผนก "Managing Director" เห็นหน้า "รออนุมัติ" (documents_pending) ในเมนูจัดการเอกสาร
// — เพิ่มสิทธิ์ผ่าน department_modules เหมือนที่แผนกอื่นได้รับ
// — ไม่ซ้ำถ้ามีอยู่แล้ว (รันซ้ำได้ปลอดภัย)
const DEPARTMENT = 'Managing Director'
const MODULES = ['documents_pending']

export async function up(connection: Connection) {
  for (const moduleName of MODULES) {
    await connection.execute(
      `INSERT INTO department_modules (department_id, module_id)
       SELECT d.id, m.id
         FROM departments d
         JOIN permission_modules m ON m.name = ?
        WHERE d.name = ?
          AND d.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM department_modules dm
             WHERE dm.department_id = d.id AND dm.module_id = m.id
          )`,
      [moduleName, DEPARTMENT],
    )
  }
}

export async function down(connection: Connection) {
  await connection.execute(
    `DELETE dm FROM department_modules dm
       JOIN departments d ON d.id = dm.department_id AND d.deleted_at IS NULL
       JOIN permission_modules m ON m.id = dm.module_id
      WHERE d.name = ? AND m.name IN (${MODULES.map(() => '?').join(',')})`,
    [DEPARTMENT, ...MODULES],
  )
}