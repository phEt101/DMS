import type { Connection } from 'mysql2/promise'

// โควตาลาเริ่มต้น 3/3/3 (ลาป่วย/ลากิจ/ลาพักร้อน) ให้พนักงานทุกคน
// เพื่อให้ทุกฟังก์ชันของโมดูลเอกสารใช้งานได้ทันทีหลัง seed
export async function up(connection: Connection) {
  await connection.execute(
    `INSERT INTO employees (user_id, sick_leave_days, personal_leave_days, vacation_leave_days, other_leave_days)
     SELECT id, 3, 3, 3, 0 FROM users WHERE deleted_at IS NULL
     ON DUPLICATE KEY UPDATE
       sick_leave_days = COALESCE(sick_leave_days, 3),
       personal_leave_days = COALESCE(personal_leave_days, 3),
       vacation_leave_days = COALESCE(vacation_leave_days, 3),
       other_leave_days = COALESCE(other_leave_days, 0)`,
  )
}
