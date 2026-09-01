import { db } from "../../../../../config/database.js";
import { httpError } from "../../../../../middleware/errors.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  name: string;
  role: string;
  department: string | null;
  phone: string | null;
  lastLoginAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWriteInput {
  email?: string;
  passwordHash?: string;
  name?: string;
  role?: string;
  department?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

interface CreateUserInput extends Required<Omit<UserWriteInput, "department" | "phone">> {
  department: string | null;
  phone: string | null;
}

interface FindUsersOptions {
  search?: string;
  status?: "all" | "active" | "inactive";
  limit?: number;
  offset?: number;
}

const selectFields = `
  users.id, users.email, users.name, roles.name AS role,
  departments.name AS department, users.phone,
  users.last_login_at AS lastLoginAt, users.is_active AS isActive,
  users.created_at AS createdAt, users.updated_at AS updatedAt
`;

const joins = `
  FROM users
  INNER JOIN roles ON roles.id = users.role_id
  LEFT JOIN departments ON departments.id = users.department_id
`;

async function resolveRoleId(name: string) {
  const [rows] = await db.execute<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM roles WHERE name = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1",
    [name],
  );
  if (!rows[0]) throw httpError(400, "Invalid role");
  return rows[0].id;
}

async function resolveDepartmentId(name: string | null) {
  if (!name) return null;
  await db.execute(
    `INSERT INTO departments (name, is_active)
     VALUES (?, 1)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), is_active = 1, deleted_at = NULL`,
    [name],
  );
  const [rows] = await db.execute<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM departments WHERE name = ? AND deleted_at IS NULL LIMIT 1",
    [name],
  );
  if (!rows[0]) throw new Error("Department could not be resolved");
  return rows[0].id;
}

export async function findAll({
  search = "",
  status = "all",
  limit = 20,
  offset = 0,
}: FindUsersOptions = {}) {
  const conditions = ["users.deleted_at IS NULL"];
  const values: Array<string | number> = [];
  if (search) {
    conditions.push("(users.email LIKE ? OR users.name LIKE ? OR departments.name LIKE ?)");
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status === "active") conditions.push("users.is_active = 1");
  if (status === "inactive") conditions.push("users.is_active = 0");

  const where = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total ${joins} ${where}`,
    values,
  );
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${selectFields} ${joins} ${where} ORDER BY users.created_at DESC, users.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return { rows, total: countRows[0]?.total ?? 0 };
}

export async function findById(id: number | string) {
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${selectFields} ${joins} WHERE users.id = ? AND users.deleted_at IS NULL LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findByEmail(email: string, excludeId: number | string | null = null) {
  const values: Array<string | number> = [email];
  let query = "SELECT id FROM users WHERE email = ?";
  if (excludeId !== null) {
    query += " AND id <> ?";
    values.push(excludeId);
  }
  const [rows] = await db.query<(RowDataPacket & { id: number })[]>(`${query} LIMIT 1`, values);
  return rows[0] ?? null;
}

export async function create({
  email,
  passwordHash,
  name,
  role,
  department,
  phone,
  isActive,
}: CreateUserInput) {
  const roleId = await resolveRoleId(role);
  const departmentId = await resolveDepartmentId(department);
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO users (email, password_hash, name, role_id, department_id, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [email, passwordHash, name, roleId, departmentId, phone, isActive],
  );
  return findById(result.insertId);
}

export async function update(id: number | string, input: UserWriteInput) {
  const normalized: Record<string, string | number | boolean | null> = { ...input };
  if (input.role !== undefined) {
    normalized.roleId = await resolveRoleId(input.role);
    delete normalized.role;
  }
  if (input.department !== undefined) {
    normalized.departmentId = await resolveDepartmentId(input.department);
    delete normalized.department;
  }
  const fields = [];
  const values: Array<string | number | boolean | null> = [];
  const columns = {
    email: "email",
    passwordHash: "password_hash",
    name: "name",
    roleId: "role_id",
    departmentId: "department_id",
    phone: "phone",
    isActive: "is_active",
  };
  for (const [key, column] of Object.entries(columns)) {
    if (Object.hasOwn(normalized, key)) {
      fields.push(`${column} = ?`);
      values.push(normalized[key] ?? null);
    }
  }
  if (!fields.length) return findById(id);
  await db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, [
    ...values,
    id,
  ]);
  return findById(id);
}

export async function softDelete(id: number | string) {
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE users SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return result.affectedRows > 0;
}

export async function findFirstActive() {
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${selectFields} ${joins} WHERE users.is_active = 1 AND users.deleted_at IS NULL ORDER BY users.id LIMIT 1`,
  );
  return rows[0] ?? null;
}
