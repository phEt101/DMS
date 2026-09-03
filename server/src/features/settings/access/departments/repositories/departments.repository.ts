import { db } from '../../../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface DepartmentRow extends RowDataPacket {
  id: number
  name: string
  isActive: boolean
  userCount: number
}

export interface DepartmentInput {
  name?: string
  isActive?: boolean
}

export async function findAll() {
  const [rows] = await db.query<DepartmentRow[]>(
    `SELECT departments.id, departments.name,
            departments.is_active AS isActive,
            COUNT(users.id) AS userCount
     FROM departments
     LEFT JOIN users ON users.department_id = departments.id AND users.deleted_at IS NULL
     WHERE departments.deleted_at IS NULL
     GROUP BY departments.id
     ORDER BY departments.name`,
  )
  return rows
}

export async function findById(id: string) {
  const [rows] = await db.query<DepartmentRow[]>(
    `SELECT id, name, is_active AS isActive, 0 AS userCount
     FROM departments WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function findDuplicate(name: string, excludeId?: string) {
  const values: string[] = [name]
  let sql = 'SELECT id FROM departments WHERE deleted_at IS NULL AND name = ?'
  if (excludeId) {
    sql += ' AND id <> ?'
    values.push(excludeId)
  }
  const [rows] = await db.query<RowDataPacket[]>(`${sql} LIMIT 1`, values)
  return rows.length > 0
}

export async function create(input: Required<DepartmentInput>) {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO departments (name, is_active) VALUES (?, ?)',
    [input.name, input.isActive],
  )
  return findById(String(result.insertId))
}

export async function update(id: string, input: DepartmentInput) {
  const columns: Record<keyof DepartmentInput, string> = {
    name: 'name', isActive: 'is_active',
  }
  const entries = Object.entries(input) as Array<[keyof DepartmentInput, DepartmentInput[keyof DepartmentInput]]>
  if (!entries.length) return findById(id)
  await db.execute(
    `UPDATE departments SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')}
     WHERE id = ? AND deleted_at IS NULL`,
    [...entries.map(([, value]) => value ?? null), id],
  )
  return findById(id)
}

export async function softDelete(id: string) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE departments SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  return result.affectedRows > 0
}
