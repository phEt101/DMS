import { db } from '../../../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface CompanyRow extends RowDataPacket {
  id: number
  name: string
  logoUrl: string | null
  isActive: boolean
  userCount: number
}
export interface CompanyInput { name?: string; logoUrl?: string | null; isActive?: boolean }

export async function findAll() {
  const [rows] = await db.query<CompanyRow[]>(
    `SELECT companies.id, companies.name, companies.logo_url AS logoUrl,
            companies.is_active AS isActive, COUNT(users.id) AS userCount
     FROM companies
     LEFT JOIN users ON users.company_id = companies.id AND users.deleted_at IS NULL
     WHERE companies.deleted_at IS NULL
     GROUP BY companies.id ORDER BY companies.name`,
  )
  return rows
}

export async function findById(id: string) {
  const [rows] = await db.query<CompanyRow[]>(
    `SELECT id, name, logo_url AS logoUrl, is_active AS isActive, 0 AS userCount
     FROM companies WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id],
  )
  return rows[0] ?? null
}

export async function findDuplicate(name: string, excludeId?: string) {
  const values: string[] = [name]
  let sql = 'SELECT id FROM companies WHERE deleted_at IS NULL AND name = ?'
  if (excludeId) { sql += ' AND id <> ?'; values.push(excludeId) }
  const [rows] = await db.query<RowDataPacket[]>(`${sql} LIMIT 1`, values)
  return rows.length > 0
}

export async function create(input: Required<CompanyInput>) {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO companies (name, logo_url, is_active) VALUES (?, ?, ?)',
    [input.name, input.logoUrl, input.isActive],
  )
  return findById(String(result.insertId))
}

export async function update(id: string, input: CompanyInput) {
  const columns: Record<keyof CompanyInput, string> = { name: 'name', logoUrl: 'logo_url', isActive: 'is_active' }
  const entries = Object.entries(input) as Array<[keyof CompanyInput, CompanyInput[keyof CompanyInput]]>
  if (entries.length) await db.execute(
    `UPDATE companies SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    [...entries.map(([, value]) => value ?? null), id],
  )
  return findById(id)
}

export async function softDelete(id: string) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE companies SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM users WHERE users.company_id = companies.id AND users.deleted_at IS NULL)`, [id],
  )
  return result.affectedRows > 0
}
