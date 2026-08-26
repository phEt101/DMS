import bcrypt from "bcryptjs";
import * as users from "../repositories/users.repository.js";
import { httpError } from "../../../../../middleware/errors.js";
import type { RequestHandler } from "express";
import type { UserRole, UserWriteInput } from "../repositories/users.repository.js";

const roles = new Set<UserRole>(["admin", "manager", "user", "viewer"]);

interface UserPayload extends UserWriteInput {
  password?: string;
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
  if (!partial || Object.hasOwn(body, "name")) {
    output.name = typeof body.name === "string" ? body.name.trim() : "";
    if (!output.name) throw httpError(400, "Name is required");
    if (output.name.length > 150) throw httpError(400, "Name is too long");
  }
  if (!partial || Object.hasOwn(body, "role")) {
    const role = body.role ?? "user";
    if (typeof role !== "string" || !roles.has(role as UserRole)) throw httpError(400, "Invalid role");
    output.role = role as UserRole;
  }
  if (!partial || Object.hasOwn(body, "isActive")) {
    if (Object.hasOwn(body, "isActive") && typeof body.isActive !== "boolean")
      throw httpError(400, "isActive must be a boolean");
    output.isActive = (body.isActive as boolean | undefined) ?? true;
  }
  const department = optionalText(body, "department", 100);
  const phone = optionalText(body, "phone", 30);
  if (department !== undefined) output.department = department;
  if (phone !== undefined) output.phone = phone;

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
  const result = await users.findAll({
    search: typeof req.query.search === "string" ? req.query.search.trim() : "",
    status,
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

export const roleSummary: RequestHandler = async (_req, res) => {
  const rows = await users.countByRole();
  const data = Object.fromEntries([...roles].map((role) => [role, 0]));
  for (const row of rows) data[row.role] = row.total;
  res.json({ data });
}

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body);
  await ensureUniqueEmail(input.email!);
  const data = await users.create({
    ...input,
    email: input.email!,
    name: input.name!,
    role: input.role!,
    department: input.department ?? null,
    phone: input.phone ?? null,
    isActive: input.isActive!,
    passwordHash: await bcrypt.hash(input.password!, 12),
  });
  res.status(201).json({ data });
}

export const patch: RequestHandler = async (req, res) => {
  const id = routeParam(req.params.id);
  if (!(await users.findById(id)))
    throw httpError(404, "User not found");
  const input = validate(req.body, { partial: true });
  if (input.email) await ensureUniqueEmail(input.email, id);
  if (input.password) {
    input.passwordHash = await bcrypt.hash(input.password, 12);
    delete input.password;
  }
  res.json({ data: await users.update(id, input) });
}

export const destroy: RequestHandler = async (req, res) => {
  if (!(await users.softDelete(routeParam(req.params.id))))
    throw httpError(404, "User not found");
  res.status(204).end();
}

export const me: RequestHandler = async (_req, res) => {
  const user = await users.findFirstActive();
  if (!user) throw httpError(404, "No active user found");
  res.json({ data: user });
}
