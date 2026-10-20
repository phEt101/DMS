import type { Connection, RowDataPacket } from 'mysql2/promise'
import { departments } from './access-control-data.js'

export async function up(connection: Connection) {
  const [companyRows] = await connection.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM companies WHERE name = 'Boswell' AND deleted_at IS NULL LIMIT 1`,
  )
  const companyId = Number(companyRows[0]?.id)
  if (!companyId) throw new Error('Boswell company is required before seeding departments')
  await connection.query(
    `INSERT INTO departments (company_id, name, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
    [departments.map((name) => [companyId, name, 1])],
  )

  await connection.execute(
    `UPDATE users
     SET department_id = (SELECT id FROM departments WHERE company_id = users.company_id AND name = 'IT Div.' LIMIT 1)
     WHERE department_id = (SELECT id FROM departments WHERE company_id = users.company_id AND name = 'IT / System' LIMIT 1)`,
  )
  await connection.execute(
    `UPDATE projects
     SET department_id = (SELECT id FROM departments WHERE company_id = ? AND name = 'IT Div.' LIMIT 1)
     WHERE department_id = (SELECT id FROM departments WHERE company_id = ? AND name = 'IT / System' LIMIT 1)`,
    [companyId, companyId],
  )
  await connection.execute(
    `UPDATE project_types
     SET department_id = (SELECT id FROM departments WHERE company_id = ? AND name = 'IT Div.' LIMIT 1)
     WHERE department_id = (SELECT id FROM departments WHERE company_id = ? AND name = 'IT / System' LIMIT 1)`,
    [companyId, companyId],
  )
  await connection.execute(
    `UPDATE departments
     SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
     WHERE company_id = ? AND name = 'IT / System'`,
    [companyId],
  )
}
