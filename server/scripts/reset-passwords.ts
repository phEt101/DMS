import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'

// รีเซ็ตรหัสผ่านของผู้ใช้ทุกคน (ที่ยัง active) ให้เป็นรหัสเดียวกัน
// เพื่อให้แต่ละคนเข้าสู่ระบบแล้วไปเปลี่ยนรหัสเอง
// การใช้งาน:  npx tsx scripts/reset-passwords.ts --password=12345678
//            npx tsx scripts/reset-passwords.ts --password=12345678 --dry-run

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const passwordArg = args.find((arg) => arg.startsWith('--password='))?.slice('--password='.length)
const password = passwordArg ?? process.env.SEED_DEFAULT_PASSWORD

if (!password) {
  throw new Error('ต้องระบุรหัสผ่านใหม่ เช่น --password=12345678 (หรือตั้ง SEED_DEFAULT_PASSWORD)')
}
if (password.length < 8) {
  throw new Error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
})

try {
  const [users] = await connection.query<(mysql.RowDataPacket & { id: number; name: string; email: string })[]>(
    'SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY id',
  )

  console.log(`พบผู้ใช้ที่ยัง active ทั้งหมด ${users.length} คน จะถูกรีเซ็ตรหัสผ่านเป็นรหัสใหม่${dryRun ? ' (ทดลองรัน — ยังไม่ได้แก้จริง)' : ''}`)

  if (dryRun) {
    for (const user of users) console.log(` - ${user.id}: ${user.name} <${user.email}>`)
    process.exit(0)
  }

  const hash = await bcrypt.hash(password, 12)
  const [result] = await connection.execute(
    'UPDATE users SET password_hash = ? WHERE is_active = 1',
    [hash],
  )
  console.log(`รีเซ็ตรหัสผ่านสำเร็จ: ${(result as mysql.ResultSetHeader).affectedRows} บัญชี`)
  console.log('แจ้งผู้ใช้ทุกคนให้เข้าสู่ระบบด้วยรหัสใหม่ แล้วไปเปลี่ยนรหัสเองในหน้าโปรไฟล์')
} finally {
  await connection.end()
}
