import bcrypt from 'bcryptjs'
import type { Connection, RowDataPacket } from 'mysql2/promise'

// บัญชี admin เริ่มต้น — หนึ่งบัญชีต่อหนึ่งบริษัท (แผนก: IT Div.)
const admins = [
  { name: 'System Administrator', firstName: 'System', lastName: 'Administrator', email: 'admin@boswell.co.th', company: 'Boswell' },
  { name: 'Boswell Digital Administrator', firstName: 'Boswell Digital', lastName: 'Administrator', email: 'admin@boswelldigital.co.th', company: 'Boswell Digital' },
  { name: 'Big money Administrator', firstName: 'Bigmoney', lastName: 'Administrator', email: 'admin@bigmoney.co.th', company: 'Bigmoney' },
] as const

export async function up(connection: Connection) {
  const initialCredential = process.env.SEED_DEFAULT_PASSWORD
  if (!initialCredential) {
    throw new Error('SEED_DEFAULT_PASSWORD is required to seed users')
  }

  const credentialHash = await bcrypt.hash(initialCredential, 12)

  for (const admin of admins) {
    const [users] = await connection.execute<(RowDataPacket & { id: number })[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [admin.email],
    )
    const values = [admin.name, admin.firstName, admin.lastName, credentialHash, 'admin', 'IT Div.', admin.company]

    if (users.length > 0) {
      const userId = users[0]?.id
      if (!userId) throw new Error('Admin user id is missing')
      await connection.execute(
        `UPDATE users
         SET name = ?, first_name = ?, last_name = ?, password_hash = ?,
             role_id = (SELECT id FROM roles WHERE name = ? LIMIT 1),
             department_id = (SELECT id FROM departments WHERE company_id = (SELECT id FROM companies WHERE name = ? LIMIT 1) AND name = ? LIMIT 1),
             company_id = (SELECT id FROM companies WHERE name = ? LIMIT 1),
             is_active = 1, deleted_at = NULL
         WHERE id = ?`,
        [...values, userId],
      )
      continue
    }

    // บางบริษัทอาจยังไม่มีแผนก IT Div. (005_departments seed เฉพาะ Boswell) — fallback ใช้แผนกแรกของบริษัทนั้น
    await connection.execute(
      `INSERT INTO users (name, first_name, last_name, email, password_hash, role_id, department_id, company_id, is_active)
       VALUES (?, ?, ?, ?, ?,
         (SELECT id FROM roles WHERE name = ? LIMIT 1),
         COALESCE(
           (SELECT id FROM departments WHERE company_id = (SELECT id FROM companies WHERE name = ? LIMIT 1) AND name = ? LIMIT 1),
           (SELECT id FROM departments WHERE company_id = (SELECT id FROM companies WHERE name = ? LIMIT 1) AND deleted_at IS NULL ORDER BY id LIMIT 1)
         ),
         (SELECT id FROM companies WHERE name = ? LIMIT 1), 1)`,
      [admin.name, admin.firstName, admin.lastName, admin.email, credentialHash, 'admin',
        admin.company, 'IT Div.', admin.company, admin.company],
    )
  }
}
