import { db } from '../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface PermissionRow extends RowDataPacket {
  id: number
  name: string
  description: string | null
  module: string
  isActive: boolean
  roleCount: number
}

export interface PermissionInput {
  name?: string
  description?: string | null
  module?: string
  isActive?: boolean
}

export async function findAll() {
  const [rows] = await db.query<PermissionRow[]>(
    `SELECT permissions.id, permissions.name,
            permissions.description, permissions.module,
            permissions.is_active AS isActive,
            COUNT(role_permissions.role_id) AS roleCount
     FROM permissions
     LEFT JOIN role_permissions ON role_permissions.permission_id = permissions.id
     WHERE permissions.deleted_at IS NULL
     GROUP BY permissions.id
     ORDER BY permissions.module, permissions.name`,
  )
  return rows
}

export async function findById(id: string) {
  const [rows] = await db.query<PermissionRow[]>(
    `SELECT id, name, description, module, is_active AS isActive, 0 AS roleCount
     FROM permissions WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id],
  )
  return rows[0] ?? null
}

export async function findDuplicate(name: string, module: string, excludeId?: string) {
  const values = [name, module]
  let sql = 'SELECT id FROM permissions WHERE deleted_at IS NULL AND name = ? AND module = ?'
  if (excludeId) { sql += ' AND id <> ?'; values.push(excludeId) }
  const [rows] = await db.query<RowDataPacket[]>(`${sql} LIMIT 1`, values)
  return rows.length > 0
}

export async function create(input: Required<PermissionInput>) {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO permissions (name, description, module, is_active) VALUES (?, ?, ?, ?)',
    [input.name, input.description, input.module, input.isActive],
  )
  return findById(String(result.insertId))
}

export async function update(id: string, input: PermissionInput) {
  const columns: Record<keyof PermissionInput, string> = {
    name: 'name', description: 'description', module: 'module', isActive: 'is_active',
  }
  const entries = Object.entries(input) as Array<[keyof PermissionInput, PermissionInput[keyof PermissionInput]]>
  if (!entries.length) return findById(id)
  await db.execute(
    `UPDATE permissions SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')}
     WHERE id = ? AND deleted_at IS NULL`,
    [...entries.map(([, value]) => value ?? null), id],
  )
  return findById(id)
}

export async function softDelete(id: string) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE permissions SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`, [id],
  )
  return result.affectedRows > 0
}
