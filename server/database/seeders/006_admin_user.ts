import bcrypt from 'bcryptjs'
import type { Connection, RowDataPacket } from 'mysql2/promise'

const admin = {
  name: 'System Administrator',
  firstName: 'System',
  lastName: 'Administrator',
  email: 'admin@boswell.co.th',
  role: 'admin',
  department: 'IT Div.',
}

export async function up(connection: Connection) {
  const initialCredential = process.env.SEED_DEFAULT_PASSWORD
  if (!initialCredential) {
    throw new Error('SEED_DEFAULT_PASSWORD is required to seed users')
  }

  const credentialHash = await bcrypt.hash(initialCredential, 12)
  const [users] = await connection.execute<(RowDataPacket & { id: number })[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [admin.email],
  )
  const values = [admin.name, admin.firstName, admin.lastName, credentialHash, admin.role, admin.department]

  if (users.length > 0) {
    const userId = users[0]?.id
    if (!userId) throw new Error('Admin user id is missing')
    await connection.execute(
      `UPDATE users
       SET name = ?, first_name = ?, last_name = ?, password_hash = ?,
           role_id = (SELECT id FROM roles WHERE name = ? LIMIT 1),
           department_id = (SELECT id FROM departments WHERE company_id = (SELECT id FROM companies WHERE name = 'Boswell' LIMIT 1) AND name = ? LIMIT 1),
           company_id = (SELECT id FROM companies WHERE name = 'Boswell' LIMIT 1),
           is_active = 1, deleted_at = NULL
       WHERE id = ?`,
      [...values, userId],
    )
    return
  }

  await connection.execute(
      `INSERT INTO users (name, first_name, last_name, email, password_hash, role_id, department_id, company_id, is_active)
     VALUES (?, ?, ?, ?, ?,
       (SELECT id FROM roles WHERE name = ? LIMIT 1),
       (SELECT id FROM departments WHERE company_id = (SELECT id FROM companies WHERE name = 'Boswell' LIMIT 1) AND name = ? LIMIT 1),
       (SELECT id FROM companies WHERE name = 'Boswell' LIMIT 1), 1)`,
    [admin.name, admin.firstName, admin.lastName, admin.email, credentialHash, admin.role, admin.department],
  )
}
