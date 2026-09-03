import { db } from '../../../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface PermissionRow extends RowDataPacket {
  id: number
  name: string
  moduleId: number
  module: string
  isActive: boolean
  roleCount: number
}

export interface PermissionInput {
  name?: string
  moduleId?: number
  isActive?: boolean
}

export async function findAll() {
  const [rows] = await db.query<PermissionRow[]>(
    `SELECT permissions.id, permissions.name,
            permission_modules.id AS moduleId,
            permission_modules.name AS module,
            permissions.is_active AS isActive,
            COUNT(role_permissions.role_id) AS roleCount
     FROM permissions
     INNER JOIN permission_modules ON permission_modules.id = permissions.module_id
     LEFT JOIN role_permissions ON role_permissions.permission_id = permissions.id
     WHERE permissions.deleted_at IS NULL
     GROUP BY permissions.id, permission_modules.id, permission_modules.name
     ORDER BY permission_modules.sort_order, permission_modules.name, permissions.name`,
  )
  return rows
}

export async function findById(id: string) {
  const [rows] = await db.query<PermissionRow[]>(
    `SELECT permissions.id, permissions.name,
            permission_modules.id AS moduleId, permission_modules.name AS module,
            permissions.is_active AS isActive, 0 AS roleCount
     FROM permissions
     INNER JOIN permission_modules ON permission_modules.id = permissions.module_id
     WHERE permissions.id = ? AND permissions.deleted_at IS NULL LIMIT 1`, [id],
  )
  return rows[0] ?? null
}

export async function findDuplicate(name: string, moduleId: number, excludeId?: string) {
  const values: Array<string | number> = [name, moduleId]
  let sql = 'SELECT id FROM permissions WHERE deleted_at IS NULL AND name = ? AND module_id = ?'
  if (excludeId) { sql += ' AND id <> ?'; values.push(excludeId) }
  const [rows] = await db.query<RowDataPacket[]>(`${sql} LIMIT 1`, values)
  return rows.length > 0
}

export async function create(input: Required<PermissionInput>) {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO permissions (name, module_id, is_active) VALUES (?, ?, ?)',
    [input.name, input.moduleId, input.isActive],
  )
  return findById(String(result.insertId))
}

export async function update(id: string, input: PermissionInput) {
  const columns: Record<keyof PermissionInput, string> = {
    name: 'name', moduleId: 'module_id', isActive: 'is_active',
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

