import { db } from "../../../../../config/database.js";
import { httpError } from "../../../../../middleware/errors.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
export interface PermissionModuleRow extends RowDataPacket {
  id: number;
  name: string;
  iconName: string | null;
  isActive: boolean;
  sortOrder: number;
  permissionCount: number;
}
export interface PermissionModuleInput {
  name?: string;
  iconName?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}
export async function findAll() {
  const [rows] = await db.query<PermissionModuleRow[]>(
    `SELECT permission_modules.id, permission_modules.name, permission_modules.icon_name AS iconName, permission_modules.is_active AS isActive, permission_modules.sort_order AS sortOrder, COUNT(permissions.id) AS permissionCount FROM permission_modules LEFT JOIN permissions ON permissions.module_id = permission_modules.id AND permissions.deleted_at IS NULL WHERE permission_modules.deleted_at IS NULL GROUP BY permission_modules.id ORDER BY permission_modules.sort_order, permission_modules.name`,
  );
  return rows;
}
export async function findAllIcons() {
  const [rows] = await db.query<Array<RowDataPacket & Pick<PermissionModuleRow, "name" | "iconName" | "sortOrder">>>(
    `SELECT name, icon_name AS iconName, sort_order AS sortOrder FROM permission_modules WHERE deleted_at IS NULL ORDER BY sort_order, name`,
  );
  return rows;
}
export async function exists(id: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM permission_modules WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  return rows.length > 0;
}
export async function findById(id: string) {
  const [rows] = await db.query<PermissionModuleRow[]>(
    `SELECT permission_modules.id, permission_modules.name, permission_modules.icon_name AS iconName, permission_modules.is_active AS isActive, permission_modules.sort_order AS sortOrder, COUNT(permissions.id) AS permissionCount FROM permission_modules LEFT JOIN permissions ON permissions.module_id = permission_modules.id AND permissions.deleted_at IS NULL WHERE permission_modules.id = ? AND permission_modules.deleted_at IS NULL GROUP BY permission_modules.id LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}
export async function findDuplicate(name: string, excludeId?: string) {
  const values: string[] = [name];
  let sql = `SELECT id FROM permission_modules WHERE deleted_at IS NULL AND name = ?`;
  if (excludeId) {
    sql += ` AND id <> ?`;
    values.push(excludeId);
  }
  const [rows] = await db.query<RowDataPacket[]>(`${sql} LIMIT 1`, values);
  return rows.length > 0;
}
export async function create(input: Required<PermissionModuleInput>) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO permission_modules (name, icon_name, is_active, sort_order) VALUES (?, ?, ?, ?)`,
    [input.name, input.iconName, input.isActive, input.sortOrder],
  );
  return findById(String(result.insertId));
}
export async function update(id: string, input: PermissionModuleInput) {
  const columns: Record<keyof PermissionModuleInput, string> = {
    name: `name`,
    iconName: `icon_name`,
    isActive: `is_active`,
    sortOrder: `sort_order`,
  };
  const entries = Object.entries(input) as Array<
    [
      keyof PermissionModuleInput,
      PermissionModuleInput[keyof PermissionModuleInput],
    ]
  >;
  if (entries.length)
    await db.execute(
      `UPDATE permission_modules SET ${entries.map(([key]) => `${columns[key]} = ?`).join(`, `)} WHERE id = ? AND deleted_at IS NULL`,
      [...entries.map(([, value]) => value ?? null), id],
    );
  return findById(id);
}
export async function reorder(ids: number[]) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM permission_modules WHERE deleted_at IS NULL ORDER BY sort_order, name FOR UPDATE`,
    );
    const currentIds = rows.map((row) => Number(row.id));
    const requestedIds = new Set(ids);
    if (ids.length !== currentIds.length || requestedIds.size !== ids.length || currentIds.some((id) => !requestedIds.has(id))) {
      throw httpError(409, "Module list changed; refresh and try again");
    }
    for (const [index, moduleId] of ids.entries()) {
      await connection.execute(
        `UPDATE permission_modules SET sort_order = ? WHERE id = ? AND deleted_at IS NULL`,
        [(index + 1) * 10, moduleId],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return findAll();
}
export async function softDelete(id: string) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE permission_modules SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM permissions WHERE module_id = permission_modules.id AND deleted_at IS NULL)`,
    [id],
  );
  return result.affectedRows > 0;
}
