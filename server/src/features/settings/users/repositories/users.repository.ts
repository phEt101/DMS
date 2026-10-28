import { db } from "../../../../config/database.js";
import { httpError } from "../../../../middleware/errors.js";
import { avatarUrlOf } from "../middleware/avatar-upload.middleware.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  companyId: number;
  company: string;
  companyLogoUrl: string | null;
  role: string;
  department: string | null;
  phone: string | null;
  avatarPath: string | null;
  employeeCode: string | null;
  employmentStartDate: string | null;
  appointedDate: string | null;
  sickLeaveDays: number | null;
  personalLeaveDays: number | null;
  vacationLeaveDays: number | null;
  otherLeaveDays: number | null;
  emailNotificationsEnabled: boolean | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWriteInput {
  email?: string;
  passwordHash?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  companyId?: number;
  role?: string;
  department?: string | null;
  phone?: string | null;
  avatarPath?: string | null;
  isActive?: boolean;
  employeeCode?: string | null;
  employmentStartDate?: string | null;
  appointedDate?: string | null;
  sickLeaveDays?: number | null;
  personalLeaveDays?: number | null;
  vacationLeaveDays?: number | null;
  otherLeaveDays?: number | null;
  emailNotificationsEnabled?: boolean | null;
}

interface CreateUserInput extends Required<Omit<UserWriteInput, "department" | "phone" | "avatarPath" | "passwordHash" | "employeeCode" | "employmentStartDate" | "appointedDate" | "sickLeaveDays" | "personalLeaveDays" | "vacationLeaveDays" | "otherLeaveDays" | "emailNotificationsEnabled">> {
  department: string | null;
  phone: string | null;
  avatarPath?: string | null;
  passwordHash: string;
  employeeCode?: string | null;
  employmentStartDate?: string | null;
  appointedDate?: string | null;
  sickLeaveDays?: number | null;
  personalLeaveDays?: number | null;
  vacationLeaveDays?: number | null;
  otherLeaveDays?: number | null;
  emailNotificationsEnabled?: boolean | null;
}

interface FindUsersOptions {
  search?: string;
  status?: "all" | "active" | "inactive";
  role?: string;
  companyId?: number;
  departmentId?: number;
  limit?: number;
  offset?: number;
}

const selectFields = `
  users.id, users.email, users.name, users.first_name AS firstName, users.last_name AS lastName,
  users.company_id AS companyId, companies.name AS company, companies.logo_url AS companyLogoUrl,
  roles.name AS role, departments.name AS department, users.phone, users.avatar_path AS avatarPath,
  employees.employee_code AS employeeCode,
  employees.employment_start_date AS employmentStartDate, employees.appointed_date AS appointedDate,
  employees.sick_leave_days AS sickLeaveDays, employees.personal_leave_days AS personalLeaveDays,
  employees.vacation_leave_days AS vacationLeaveDays, employees.other_leave_days AS otherLeaveDays,
  employees.email_notifications_enabled AS emailNotificationsEnabled,
  users.is_active AS isActive,
  users.created_at AS createdAt, users.updated_at AS updatedAt
`;

const joins = `
  FROM users
  INNER JOIN roles ON roles.id = users.role_id
  LEFT JOIN departments ON departments.id = users.department_id
  INNER JOIN companies ON companies.id = users.company_id
  LEFT JOIN employees ON employees.user_id = users.id
`;

async function resolveRoleId(name: string) {
  const [rows] = await db.execute<(RowDataPacket & { id: number })[]>(
    "SELECT id FROM roles WHERE name = ? AND deleted_at IS NULL LIMIT 1",
    [name],
  );
  if (!rows[0]) throw httpError(400, "Invalid role");
  return rows[0].id;
}

async function resolveDepartmentId(name: string | null, companyId: number) {
  if (!name) return null;
  const [rows] = await db.execute<(RowDataPacket & { id: number })[]>(
    // ไม่บังคับ is_active เพื่อให้ยังอ้างอิงแผนกเดิมที่ถูกปิดใช้งานได้ (เช่นตอนแก้ไขพนักงานที่ยังสังกัดแผนกนั้น)
    "SELECT id FROM departments WHERE company_id = ? AND name = ? AND deleted_at IS NULL LIMIT 1",
    [companyId, name],
  );
  if (!rows[0]) throw httpError(400, "Invalid department");
  return rows[0].id;
}

async function resolveCompanyId(id: number) {
  const [rows] = await db.execute<(RowDataPacket & { id: number })[]>(
    'SELECT id FROM companies WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1', [id],
  )
  if (!rows[0]) throw httpError(400, 'Invalid company')
  return rows[0].id
}

// แปลง avatar_path ใน DB เป็น avatarUrl สำหรับส่งให้ frontend (และไม่ส่ง path จริงออกไป)
function withAvatarUrl<T extends { avatarPath?: string | null; avatarUrl?: string | null }>(row: T): T {
  if (!row) return row;
  const { avatarPath, ...rest } = row;
  return { ...rest, avatarUrl: avatarUrlOf(avatarPath) } as T;
}

export async function findAll({
  search = "",
  status = "all",
  role = "",
  companyId,
  departmentId,
  limit = 20,
  offset = 0,
}: FindUsersOptions = {}) {
  const conditions = ["users.deleted_at IS NULL"];
  const values: Array<string | number> = [];
  if (search) {
    conditions.push("(users.email LIKE ? OR users.name LIKE ? OR departments.name LIKE ? OR companies.name LIKE ? OR employees.employee_code LIKE ?)");
    values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status === "active") conditions.push("users.is_active = 1");
  if (status === "inactive") conditions.push("users.is_active = 0");
  if (role) {
    conditions.push("roles.name = ?");
    values.push(role);
  }
  if (companyId) {
    conditions.push("users.company_id = ?");
    values.push(companyId);
  }
  if (departmentId) {
    conditions.push("users.department_id = ?");
    values.push(departmentId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total ${joins} ${where}`,
    values,
  );
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${selectFields} ${joins} ${where} ORDER BY users.created_at DESC, users.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return { rows: rows.map(withAvatarUrl), total: countRows[0]?.total ?? 0 };
}

export async function findById(id: number | string) {
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${selectFields} ${joins} WHERE users.id = ? AND users.deleted_at IS NULL LIMIT 1`,
    [id],
  );
  return rows[0] ? withAvatarUrl(rows[0]) : null;
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
  firstName,
  lastName,
  companyId,
  role,
  department,
  phone,
  avatarPath,
  isActive,
  employeeCode,
  employmentStartDate,
  appointedDate,
  sickLeaveDays,
  personalLeaveDays,
  vacationLeaveDays,
  otherLeaveDays,
  emailNotificationsEnabled,
}: CreateUserInput) {
  const resolvedCompanyId = await resolveCompanyId(companyId);
  const roleId = await resolveRoleId(role);
  const departmentId = await resolveDepartmentId(department, resolvedCompanyId);
  const connection = await db.getConnection();
  let userId: number;
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      "INSERT INTO users (email, password_hash, name, first_name, last_name, role_id, department_id, company_id, phone, avatar_path, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [email, passwordHash, name, firstName, lastName, roleId, departmentId, resolvedCompanyId, phone, avatarPath ?? null, isActive],
    );
    userId = result.insertId;
    await connection.execute(
      `INSERT INTO employees (
        user_id, employee_code, employment_start_date, appointed_date,
        sick_leave_days, personal_leave_days, vacation_leave_days, other_leave_days, email_notifications_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, employeeCode ?? null, employmentStartDate ?? null, appointedDate ?? null,
        sickLeaveDays ?? null, personalLeaveDays ?? null, vacationLeaveDays ?? null, otherLeaveDays ?? null, emailNotificationsEnabled ?? true],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return findById(userId);
}

export async function update(id: number | string, input: UserWriteInput) {
  const normalized: Record<string, string | number | boolean | null> = { ...input };
  const current = await findById(id);
  if (!current) return null;
  const resolvedCompanyId = input.companyId !== undefined
    ? await resolveCompanyId(input.companyId)
    : current.companyId;
  if (input.role !== undefined && input.role !== current?.role) {
    normalized.roleId = await resolveRoleId(input.role);
    delete normalized.role;
  } else if (input.role !== undefined) {
    delete normalized.role;
  }
  if (input.department !== undefined || (input.companyId !== undefined && input.companyId !== current.companyId)) {
    normalized.departmentId = await resolveDepartmentId(input.department ?? current.department, resolvedCompanyId);
    delete normalized.department;
  } else if (input.department !== undefined) {
    // แผนกไม่เปลี่ยน — ไม่ต้อง resolve/update ที่ DB
    delete normalized.department;
  }
  if (input.companyId !== undefined) normalized.companyId = resolvedCompanyId
  const userFields: string[] = [];
  const userValues: Array<string | number | boolean | null> = [];
  const userColumns = {
    email: "email",
    passwordHash: "password_hash",
    name: "name",
    firstName: "first_name",
    lastName: "last_name",
    roleId: "role_id",
    departmentId: "department_id",
    companyId: "company_id",
    phone: "phone",
    avatarPath: "avatar_path",
    isActive: "is_active",
  };
  for (const [key, column] of Object.entries(userColumns)) {
    if (Object.hasOwn(normalized, key)) {
      userFields.push(`${column} = ?`);
      userValues.push(normalized[key] ?? null);
    }
  }
  const employeeColumns = {
    employeeCode: "employee_code",
    employmentStartDate: "employment_start_date",
    appointedDate: "appointed_date",
    sickLeaveDays: "sick_leave_days",
    personalLeaveDays: "personal_leave_days",
    vacationLeaveDays: "vacation_leave_days",
    otherLeaveDays: "other_leave_days",
    emailNotificationsEnabled: "email_notifications_enabled",
  };
  const employeeFields: string[] = [];
  const employeeValues: Array<string | number | boolean | null> = [];
  for (const [key, column] of Object.entries(employeeColumns)) {
    if (Object.hasOwn(normalized, key)) {
      employeeFields.push(`${column} = ?`);
      employeeValues.push(normalized[key] ?? null);
    }
  }
  if (!userFields.length && !employeeFields.length) return findById(id);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (userFields.length) {
      await connection.execute(`UPDATE users SET ${userFields.join(", ")} WHERE id = ?`, [...userValues, id]);
    }
    if (employeeFields.length) {
      await connection.execute("INSERT IGNORE INTO employees (user_id) VALUES (?)", [id]);
      await connection.execute(`UPDATE employees SET ${employeeFields.join(", ")} WHERE user_id = ?`, [...employeeValues, id]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return findById(id);
}

export async function softDelete(id: number | string) {
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE users SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return result.affectedRows > 0;
}
