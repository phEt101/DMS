import type { RequestHandler } from "express";
import { httpError } from "../../../../../middleware/errors.js";
import * as roles from "../repositories/roles.repository.js";
import type { RoleCreateInput } from "../repositories/roles.repository.js";

function roleId(value: string| string[] | undefined): string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw httpError(400, "Invalid role ID");
  }
  return value;
}

export const index: RequestHandler = async (_req, res) => {
  const data = await roles.findAll();
  res.json({ data });
};

export const show: RequestHandler = async (req, res) => {
  const id = roleId(req.params.id);
  const data = await roles.findById(id);
  if (!data) {
    throw httpError(404, "Role not found");
  }
  res.json({ data });
};

function validateCreate(body: unknown): RoleCreateInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "Request body must be an object");
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 150) {
    throw httpError(400, "Valid role name is required");
  }

  if (input.description !== undefined && input.description !== null
    && typeof input.description !== "string") {
    throw httpError(400, "Description must be a string");
  }
  const description = typeof input.description === "string"
    ? input.description.trim().slice(0, 500) || null
    : null;

  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    throw httpError(400, "isActive must be a boolean");
  }

  if (!Array.isArray(input.permissionIds)) {
    throw httpError(400, "permissionIds must be an array");
  }
  const permissionIds = [...new Set(input.permissionIds.map((value) => {
    if (!Number.isSafeInteger(value) || Number(value) <= 0) {
      throw httpError(400, "permissionIds must contain positive integers");
    }
    return Number(value);
  }))];

  return {
    name,
    description,
    isActive: input.isActive ?? true,
    permissionIds,
  };
}

function validatePermissionIds(body: unknown): number[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "Request body must be an object");
  }
  const permissionIds = (body as Record<string, unknown>).permissionIds;
  if (!Array.isArray(permissionIds)) {
    throw httpError(400, "permissionIds must be an array");
  }

  return [...new Set(permissionIds.map((value) => {
    if (!Number.isSafeInteger(value) || Number(value) <= 0) {
      throw httpError(400, "permissionIds must contain positive integers");
    }
    return Number(value);
  }))];
}

export const store: RequestHandler = async (req, res) => {
  const input = validateCreate(req.body);
  if (await roles.nameExists(input.name)) {
    throw httpError(409, "Role name already exists");
  }

  try {
    res.status(201).json({ data: await roles.create(input) });
  } catch (error) {
    if (error instanceof roles.InvalidRolePermissionsError) {
      throw httpError(400, "One or more permissions are invalid");
    }
    throw error;
  }
};

export const syncPermissions: RequestHandler = async (req, res) => {
  const id = roleId(req.params.id);

  try {
    const data = await roles.syncPermissions(id, validatePermissionIds(req.body));
    if (!data) throw httpError(404, "Role not found");
    res.json({ data });
  } catch (error) {
    if (error instanceof roles.InvalidRolePermissionsError) {
      throw httpError(400, "One or more permissions are invalid");
    }
    throw error;
  }
};
