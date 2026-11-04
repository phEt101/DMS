import type { Connection } from 'mysql2/promise'

// โมดูล "สลิปเงินเดือน" — ทุกแผนกเข้าหน้าได้ (พนักงานดูสลิปตัวเอง) ส่วนการอัปโหลดจำกัดที่ admin / HR Div. ฝั่ง API
export async function up(connection: Connection) {
  await connection.execute(
    `INSERT IGNORE INTO department_modules (department_id, module_id)
     SELECT d.id, m.id FROM departments d CROSS JOIN permission_modules m
      WHERE m.name = 'documents_payslips' AND d.deleted_at IS NULL AND m.deleted_at IS NULL`,
  )
}
