import bcrypt from 'bcryptjs'
import type { Connection, RowDataPacket } from 'mysql2/promise'

const admin = {
  name: 'System Administrator',
  email: 'admin@boswell.com',
  role: 'admin',
  department: 'IT / System',
}

export async function up(connection: Connection) {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD
  if (!initialPassword || initialPassword.length < 8) {
    throw new Error('ADMIN_INITIAL_PASSWORD must contain at least 8 characters')
  }
  const passwordHash = await bcrypt.hash(initialPassword, 12)
  const [users] = await connection.execute<(RowDataPacket & { id: number })[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [admin.email])

  const values = [
    admin.name,
    passwordHash,
    admin.role,
    admin.department,
  ]

  if (users.length > 0) {
    const userId = users[0]?.id
    if (!userId) throw new Error('Admin user id is missing')
    await connection.execute(
      `UPDATE users
       SET name = ?, password_hash = ?,
           role_id = (SELECT id FROM roles WHERE name = ? LIMIT 1),
           department_id = (SELECT id FROM departments WHERE name = ? LIMIT 1),
           is_active = 1, deleted_at = NULL
       WHERE id = ?`,
      [...values, userId],
    )
    return
  }

  await connection.execute(
    `INSERT INTO users (name, email, password_hash, role_id, department_id, is_active)
     VALUES (
       ?, ?, ?,
       (SELECT id FROM roles WHERE name = ? LIMIT 1),
       (SELECT id FROM departments WHERE name = ? LIMIT 1),
       1
     )`,
    [admin.name, admin.email, passwordHash, admin.role, admin.department],
  )
}
