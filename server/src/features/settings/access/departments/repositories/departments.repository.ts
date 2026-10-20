import { db } from '../../../../../config/database.js'
import { httpError } from '../../../../../middleware/errors.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface DepartmentRow extends RowDataPacket {
  id: number
  companyId: number
  company: string
  name: string
  isActive: boolean
  userCount: number
  moduleIds: number[]
}

export interface DepartmentInput {
  companyId?: number
  name?: string
  isActive?: boolean
  moduleIds?: number[]
}

async function attachModules(rows: DepartmentRow[]) {
  if (!rows.length) return rows
  const [links] = await db.query<(RowDataPacket & { departmentId: number; moduleId: number })[]>(
    `SELECT department_id AS departmentId, module_id AS moduleId FROM department_modules
     WHERE department_id IN (${rows.map(() => '?').join(',')})`, rows.map((row) => row.id),
  )
  const byDepartment = new Map<number, number[]>()
  for (const link of links) byDepartment.set(link.departmentId, [...(byDepartment.get(link.departmentId) ?? []), link.moduleId])
  return rows.map((row) => ({ ...row, moduleIds: byDepartment.get(row.id) ?? [] }))
}

export async function findAll() {
  const [rows] = await db.query<DepartmentRow[]>(
    `SELECT departments.id, departments.company_id AS companyId, companies.name AS company, departments.name,
            departments.is_active AS isActive,
            COUNT(users.id) AS userCount
     FROM departments
     INNER JOIN companies ON companies.id = departments.company_id
     LEFT JOIN users ON users.department_id = departments.id AND users.deleted_at IS NULL
     WHERE departments.deleted_at IS NULL
     GROUP BY departments.id, companies.name
     ORDER BY companies.name, departments.name`,
  )
  return attachModules(rows)
}

export async function findById(id: string) {
  const [rows] = await db.query<DepartmentRow[]>(
    `SELECT departments.id, departments.company_id AS companyId, companies.name AS company,
            departments.name, departments.is_active AS isActive, 0 AS userCount
     FROM departments INNER JOIN companies ON companies.id = departments.company_id
     WHERE departments.id = ? AND departments.deleted_at IS NULL LIMIT 1`,
    [id],
  )
  return (await attachModules(rows))[0] ?? null
}

export async function findDuplicate(companyId: number, name: string, excludeId?: string) {
  const values: Array<string | number> = [companyId, name]
  let sql = 'SELECT id FROM departments WHERE deleted_at IS NULL AND company_id = ? AND name = ?'
  if (excludeId) {
    sql += ' AND id <> ?'
    values.push(excludeId)
  }
  const [rows] = await db.query<RowDataPacket[]>(`${sql} LIMIT 1`, values)
  return rows.length > 0
}

export async function create(input: Required<DepartmentInput>) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [companyRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM companies WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1', [input.companyId])
    if (!companyRows[0]) throw httpError(400, 'Invalid company')
    const [result] = await connection.execute<ResultSetHeader>('INSERT INTO departments (company_id, name, is_active) VALUES (?, ?, ?)', [input.companyId, input.name, input.isActive])
    for (const moduleId of input.moduleIds) await connection.execute('INSERT INTO department_modules (department_id, module_id) VALUES (?, ?)', [result.insertId, moduleId])
    await connection.commit()
    return findById(String(result.insertId))
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
}

export async function update(id: string, input: DepartmentInput) {
  const columns: Record<'companyId' | 'name' | 'isActive', string> = {
    companyId: 'company_id', name: 'name', isActive: 'is_active',
  }
  const { moduleIds, ...fields } = input
  const entries = Object.entries(fields) as Array<['companyId' | 'name' | 'isActive', string | number | boolean | undefined]>
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    if (input.companyId !== undefined) {
      const [companyRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM companies WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1', [input.companyId])
      if (!companyRows[0]) throw httpError(400, 'Invalid company')
      const [userRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM users WHERE department_id = ? AND company_id <> ? AND deleted_at IS NULL LIMIT 1', [id, input.companyId])
      if (userRows[0]) throw httpError(409, 'Department has users from another company')
    }
    if (entries.length) await connection.execute(`UPDATE departments SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')} WHERE id = ? AND deleted_at IS NULL`, [...entries.map(([, value]) => value ?? null), id])
    if (moduleIds) {
      await connection.execute('DELETE FROM department_modules WHERE department_id = ?', [id])
      for (const moduleId of moduleIds) await connection.execute('INSERT INTO department_modules (department_id, module_id) VALUES (?, ?)', [id, moduleId])
    }
    await connection.commit()
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
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
