import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const passwordArg = args.find((arg) => arg.startsWith('--password='))?.slice('--password='.length)
const password = passwordArg ?? process.env.SEED_DEFAULT_PASSWORD

if (!password) {
  throw new Error('Password is required (ต้องระบุรหัสผ่านใหม่) Example: --password=12345678 (ตัวอย่าง) or set SEED_DEFAULT_PASSWORD (หรือตั้งค่า SEED_DEFAULT_PASSWORD)')
}

if (password.length < 8) {
  throw new Error('Password must be at least 8 characters long (รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร)')
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
})

try {
  const [users] = await connection.query<
    (mysql.RowDataPacket & { id: number; name: string; email: string })[]
  >(
    'SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY id',
  )

  console.log(
    `Found ${users.length} active users (พบผู้ใช้ที่ยังใช้งานอยู่ทั้งหมด ${users.length} คน). All will be assigned the new password (ทุกบัญชีจะถูกเปลี่ยนเป็นรหัสผ่านใหม่).${dryRun ? ' [DRY RUN - No changes made (ทดลองรัน - ไม่มีการแก้ไขข้อมูลจริง)]' : ''}`,
  )

  if (dryRun) {
    for (const user of users) {
      console.log(` - ${user.id}: ${user.name} <${user.email}>`)
    }
    process.exit(0)
  }

  const hash = await bcrypt.hash(password, 12)

  const [result] = await connection.execute(
    'UPDATE users SET password_hash = ? WHERE is_active = 1',
    [hash],
  )

  console.log(
    `Password reset successful: ${(result as mysql.ResultSetHeader).affectedRows} accounts (รีเซ็ตรหัสผ่านสำเร็จ ${ (result as mysql.ResultSetHeader).affectedRows} บัญชี)`,
  )
  console.log(
    'Notify all users to log in with the new password and change it in their profile (แจ้งผู้ใช้ทุกคนให้เข้าสู่ระบบด้วยรหัสผ่านใหม่ แล้วเปลี่ยนรหัสผ่านในหน้าโปรไฟล์)',
  )
} finally {
  await connection.end()
}
