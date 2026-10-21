import type { Connection } from 'mysql2/promise'

// 1) หน้า "ส่วนจัดการเอกสาร / หน้าจอพนักงาน" (documents_employees),
//    "นโยบายการลา" (documents_policy) และ "กำหนดสิทธิ์ในการยื่นเอกสาร" (documents_flow_rules)
//    ให้เห็นได้เฉพาะ admin (ตรวจที่ role ใน frontend) และแผนก HR Div. เท่านั้น
//    — ลบออกจากแผนกอื่นที่เคยได้รับผ่านสิทธิ์ 'จัดการนโยบายการลา'
// 2) โลโก้บริษัท — ไฟล์อยู่ที่ server/storage/branding/ และเสิร์ฟผ่าน
//    GET /boswell-api/v1/branding/<file> (ดูใน src/features/index.ts)
//    ตั้ง logo_url ของบริษัทเพื่อแสดงในแถบด้านข้างแทนโลโก้เริ่มต้น
const LOGOS: Array<[string, string]> = [
  ['Bigmoney', '/boswell-api/v1/branding/logo-big-money.svg'],
  ['Boswell Digital', '/boswell-api/v1/branding/logo-boswell-digital.png'],
]

export async function up(connection: Connection) {
  await connection.execute(
    `DELETE dm FROM department_modules dm
       JOIN departments d ON d.id = dm.department_id AND d.deleted_at IS NULL
       JOIN permission_modules m ON m.id = dm.module_id
      WHERE m.name IN ('documents_employees', 'documents_policy', 'documents_flow_rules')
        AND d.name <> 'HR Div.'`,
  )

  for (const [company, logoUrl] of LOGOS) {
    await connection.execute(
      `UPDATE companies SET logo_url = ? WHERE name = ? AND deleted_at IS NULL`,
      [logoUrl, company],
    )
  }
}
