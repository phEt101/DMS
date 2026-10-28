import bcrypt from "bcryptjs";
import * as users from "../repositories/users.repository.js";
import { httpError } from "../../../../middleware/errors.js";
import type { RequestHandler } from "express";
import type { UserWriteInput } from "../repositories/users.repository.js";
import { logActivity } from "../../activity/repositories/activity.repository.js";

interface UserPayload extends UserWriteInput {
  password?: string;
}

interface UserChange {
  field: string;
  from?: string | number | boolean | null;
  to?: string | number | boolean | null;
  changed?: true;
}

function collectChanges(
  current: Awaited<ReturnType<typeof users.findById>>,
  input: UserPayload,
): UserChange[] {
  if (!current) return [];

  const changes: UserChange[] = [];
  const fields = ["firstName", "lastName", "email", "role", "department", "companyId", "phone", "avatarPath", "isActive", "employeeCode", "employmentStartDate", "appointedDate", "sickLeaveDays", "personalLeaveDays", "vacationLeaveDays", "otherLeaveDays", "emailNotificationsEnabled"] as const;
  for (const field of fields) {
    if (!Object.hasOwn(input, field)) continue;
    const from = field === "isActive" ? Boolean(current[field]) : current[field];
    const to = field === "isActive" ? Boolean(input[field]) : input[field] ?? null;
    if (from !== to) changes.push({ field, from, to });
  }
  if (input.password) changes.push({ field: "password", changed: true });

  return changes;
}

function positiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) && number > 0
    ? Math.min(number, maximum)
    : fallback;
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function routeParam(value: string | string[] | undefined): string {
  if (typeof value !== "string") throw httpError(400, "Invalid route parameter");
  return value;
}

function optionalText(input: Record<string, unknown>, key: string, maximum: number) {
  if (!Object.hasOwn(input, key)) return undefined;
  if (input[key] === null || input[key] === "") return null;
  if (typeof input[key] !== "string")
    throw httpError(400, `${key} must be a string`);
  const value = input[key].trim();
  if (value.length > maximum) throw httpError(400, `${key} is too long`);
  return value || null;
}

function optionalDate(input: Record<string, unknown>, key: string) {
  if (!Object.hasOwn(input, key)) return undefined;
  const value = input[key];
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw httpError(400, `${key} must be an ISO date`);
  return value;
}

function optionalNonNegativeNumber(input: Record<string, unknown>, key: string) {
  if (!Object.hasOwn(input, key)) return undefined;
  const value = input[key];
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 99999) throw httpError(400, `${key} must be a non-negative number`);
  return number;
}

function validate(input: unknown, { partial = false }: { partial?: boolean } = {}): UserPayload {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw httpError(400, "Request body must be an object");
  const body = input as Record<string, unknown>;
  const output: UserPayload = {};
  if (!partial || Object.hasOwn(body, "email")) {
    output.email = normalizeEmail(body.email);
    if (!/^\S+@\S+\.\S+$/.test(output.email))
      throw httpError(400, "Valid email is required");
  }
  for (const field of ["firstName", "lastName"] as const) {
    if (!partial || Object.hasOwn(body, field)) {
      const value = typeof body[field] === "string" ? body[field].trim() : "";
      if (!value) throw httpError(400, `${field} is required`);
      if (value.length > 150) throw httpError(400, `${field} is too long`);
      output[field] = value;
    }
  }
  if (!partial || Object.hasOwn(body, "companyId")) {
    const companyId = Number(body.companyId);
    if (!Number.isSafeInteger(companyId) || companyId < 1) throw httpError(400, "Valid company is required");
    output.companyId = companyId;
  }
  if (!partial || Object.hasOwn(body, "role")) {
    const role = typeof body.role === "string" ? body.role.trim() : "";
    if (!role || role.length > 100) throw httpError(400, "Invalid role");
    output.role = role;
  }
  if (!partial || Object.hasOwn(body, "isActive")) {
    if (Object.hasOwn(body, "isActive") && typeof body.isActive !== "boolean")
      throw httpError(400, "isActive must be a boolean");
    output.isActive = (body.isActive as boolean | undefined) ?? true;
  }
  const department = optionalText(body, "department", 100);
  const phone = optionalText(body, "phone", 30);
  const avatarPath = optionalText(body, "avatarPath", 255);
  const employeeCode = optionalText(body, "employeeCode", 50);
  if (department !== undefined) output.department = department;
  if (phone !== undefined) output.phone = phone;
  if (avatarPath !== undefined) output.avatarPath = avatarPath;
  if (employeeCode !== undefined) output.employeeCode = employeeCode;
  for (const field of ["employmentStartDate", "appointedDate"] as const) {
    const value = optionalDate(body, field);
    if (value !== undefined) output[field] = value;
  }
  for (const field of ["sickLeaveDays", "personalLeaveDays", "vacationLeaveDays", "otherLeaveDays"] as const) {
    const value = optionalNonNegativeNumber(body, field);
    if (value !== undefined) output[field] = value;
  }
  if (Object.hasOwn(body, "emailNotificationsEnabled")) {
    if (typeof body.emailNotificationsEnabled !== "boolean" && body.emailNotificationsEnabled !== null) throw httpError(400, "emailNotificationsEnabled must be a boolean or null");
    output.emailNotificationsEnabled = body.emailNotificationsEnabled as boolean | null;
  }

  if (!partial || Object.hasOwn(body, "password")) {
    const password = typeof body.password === "string" ? body.password : "";
    if (!partial && password.length < 8)
      throw httpError(400, "Password must be at least 8 characters");
    if (password && password.length < 8)
      throw httpError(400, "Password must be at least 8 characters");
    if (password) output.password = password;
  }
  return output;
}

async function ensureUniqueEmail(email: string, excludeId: number | string | null = null) {
  if (await users.findByEmail(email, excludeId))
    throw httpError(409, "Email is already in use");
}

export const index: RequestHandler = async (req, res) => {
  const page = positiveInteger(req.query.page, 1);
  const limit = positiveInteger(req.query.limit, 20, 100);
  const status = req.query.status === "active" || req.query.status === "inactive"
    ? req.query.status
    : "all";
  const optionalId = (value: unknown) => {
    if (value === undefined || value === "" || value === "all") return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw httpError(400, "Invalid filter id");
    return parsed;
  };
  const result = await users.findAll({
    search: typeof req.query.search === "string" ? req.query.search.trim() : "",
    status,
    role: typeof req.query.role === "string" && req.query.role !== "all" ? req.query.role.trim() : "",
    companyId: optionalId(req.query.companyId),
    departmentId: optionalId(req.query.departmentId),
    limit,
    offset: (page - 1) * limit,
  });
  res.json({
    data: result.rows,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

export const show: RequestHandler = async (req, res) => {
  const data = await users.findById(routeParam(req.params.id));
  if (!data) throw httpError(404, "User not found");
  res.json({ data });
}

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body);
  if (`${input.firstName} ${input.lastName}`.trim().length > 150) throw httpError(400, "Full name is too long");
  await ensureUniqueEmail(input.email!);
  const data = await users.create({
    ...input,
    email: input.email!,
    name: `${input.firstName!} ${input.lastName!}`.trim(),
    firstName: input.firstName!,
    lastName: input.lastName!,
    companyId: input.companyId!,
    role: input.role!,
    department: input.department ?? null,
    phone: input.phone ?? null,
    avatarPath: input.avatarPath ?? null,
    isActive: input.isActive!,
    passwordHash: await bcrypt.hash(input.password!, 12),
  });
  await logActivity({
    userId: req.user?.id,
    module: "users",
    action: "created",
    entityType: "user",
    entityId: data?.id,
    details: { name: data?.name ?? input.name, email: data?.email ?? input.email },
    ipAddress: req.ip,
  });
  res.status(201).json({ data });
}

export const patch: RequestHandler = async (req, res) => {
  const id = routeParam(req.params.id);
  const current = await users.findById(id);
  if (!current) throw httpError(404, "User not found");
  const input = validate(req.body, { partial: true });
  if (input.firstName !== undefined || input.lastName !== undefined) {
    input.name = `${input.firstName ?? current.firstName} ${input.lastName ?? current.lastName}`.trim();
    if (input.name.length > 150) throw httpError(400, "Full name is too long");
  }
  const changes = collectChanges(current, input);
  if (input.email) await ensureUniqueEmail(input.email, id);
  if (input.password) {
    input.passwordHash = await bcrypt.hash(input.password, 12);
    delete input.password;
  }
  const data = await users.update(id, input);
  if (changes.length > 0) {
    const statusChange = changes.length === 1 && changes[0]?.field === "isActive";
    await logActivity({
      userId: req.user?.id,
      module: "users",
      action: statusChange
        ? Boolean(changes[0]?.to) ? "activated" : "deactivated"
        : "updated",
      entityType: "user",
      entityId: id,
      details: {
        name: data?.name ?? current.name,
        email: data?.email ?? current.email,
        changes,
      },
      ipAddress: req.ip,
    });
  }
  res.json({ data });
}

export const destroy: RequestHandler = async (req, res) => {
  const id = routeParam(req.params.id);
  const current = await users.findById(id);
  if (!current || !(await users.softDelete(id)))
    throw httpError(404, "User not found");
  await logActivity({
    userId: req.user?.id,
    module: "users",
    action: "deleted",
    entityType: "user",
    entityId: id,
    details: { name: current.name, email: current.email },
    ipAddress: req.ip,
  });
  res.status(204).end();
}
