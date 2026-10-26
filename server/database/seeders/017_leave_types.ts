import type { Connection } from 'mysql2/promise'

const leaveTypes = [
  ['personal', 'ลากิจ', 'Personal leave', 'personal', true, 1],
  ['sick', 'ลาป่วย', 'Sick leave', 'sick', true, 2],
  ['vacation', 'ลาพักร้อน', 'Vacation leave', 'vacation', true, 3],
  ['emergency', 'ลาพักร้อนฉุกเฉิน', 'Emergency vacation', 'vacation', true, 4],
  ['unpaid', 'ลากิจไม่รับค่าจ้าง', 'Unpaid personal leave', 'none', false, 5],
  ['maternity', 'ลาคลอด', 'Maternity leave', 'none', false, 6],
  ['ordain', 'ลาบวช', 'Ordination leave', 'none', false, 7],
  ['marriage', 'ลาสมรส', 'Marriage leave', 'none', false, 8],
  ['other', 'ลาอื่น ๆ', 'Other leave', 'other', false, 9],
] as const

export async function up(connection: Connection) {
  await connection.query(
    `INSERT INTO leave_types (code, name_th, name_en, balance_bucket, allow_by_hour, sort_order)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       name_th = VALUES(name_th),
       name_en = VALUES(name_en),
       balance_bucket = VALUES(balance_bucket),
       allow_by_hour = VALUES(allow_by_hour),
       sort_order = VALUES(sort_order),
       is_active = 1`,
    [leaveTypes.map((row) => [...row])],
  )
}
