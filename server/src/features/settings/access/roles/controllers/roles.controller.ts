import type { RequestHandler } from "express";
import { httpError } from "../../../../../middleware/errors.js";
import * as roles from "../repositories/roles.repository.js";
import type { RoleCreateInput } from "../repositories/roles.repository.js";
import { logActivity } from "../../../activity/repositories/activity.repository.js";

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

function validateRoleUpdate(body: unknown): {
  permissionIds: number[];
  isActive: boolean;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "Request body must be an object");
  }
  const permissionIds = (body as Record<string, unknown>).permissionIds;
  const isActive = (body as Record<string, unknown>).isActive;
  if (!Array.isArray(permissionIds)) {
    throw httpError(400, "permissionIds must be an array");
  }
  if (typeof isActive !== "boolean") {
    throw httpError(400, "isActive must be a boolean");
  }

  return {
    permissionIds: [...new Set(permissionIds.map((value) => {
    if (!Number.isSafeInteger(value) || Number(value) <= 0) {
      throw httpError(400, "permissionIds must contain positive integers");
    }
    return Number(value);
    }))],
    isActive,
  };
}

export const store: RequestHandler = async (req, res) => {
  const input = validateCreate(req.body);
  if (await roles.nameExists(input.name)) {
    throw httpError(409, "Role name already exists");
  }

  try {
    const data = await roles.create(input);
    await logActivity({
      userId: req.user?.id,
      module: "roles",
      action: "created",
      entityType: "role",
      entityId: data.id,
      details: { name: data.name },
      ipAddress: req.ip,
    });
    res.status(201).json({ data });
  } catch (error) {
    if (error instanceof roles.InvalidRolePermissionsError) {
      throw httpError(400, "One or more permissions are invalid");
    }
    throw error;
  }
};

export const syncPermissions: RequestHandler = async (req, res) => {
  const id = roleId(req.params.id);
  const input = validateRoleUpdate(req.body);
  const current = await roles.findById(id);
  if (!current) throw httpError(404, "Role not found");
  if (current.name.trim().toLowerCase() === "admin") input.isActive = true;

  try {
    const data = await roles.syncPermissions(
      id,
      input.permissionIds,
      input.isActive,
    );
    if (!data) throw httpError(404, "Role not found");
    const currentPermissionIds = current.permissions
      .filter((permission) => Boolean(permission.isAssigned))
      .map((permission) => permission.id)
      .sort((left, right) => left - right);
    const nextPermissionIds = [...input.permissionIds].sort(
      (left, right) => left - right,
    );
    const permissionsChanged =
      currentPermissionIds.length !== nextPermissionIds.length ||
      currentPermissionIds.some((permissionId, index) =>
        permissionId !== nextPermissionIds[index]);
    const statusChanged = Boolean(current.isActive) !== input.isActive;
    const currentPermissionIdSet = new Set(currentPermissionIds);
    const nextPermissionIdSet = new Set(nextPermissionIds);
    const changedPermissionIds = new Set([
      ...currentPermissionIds.filter((permissionId) =>
        !nextPermissionIdSet.has(permissionId)),
      ...nextPermissionIds.filter((permissionId) =>
        !currentPermissionIdSet.has(permissionId)),
    ]);
    const permissionModules = new Map([
      ...current.permissions,
      ...data.permissions,
    ].map((permission) => [
      permission.id,
      permission.module,
    ]));
    const changedModules = [...new Set(
      [...changedPermissionIds]
        .map((permissionId) => permissionModules.get(permissionId))
        .filter((module): module is string => Boolean(module)),
    )].sort();
    const changedFields = [
      ...(permissionsChanged ? ["permissions"] : []),
      ...(statusChanged ? ["isActive"] : []),
    ];

    if (changedFields.length === 0) {
      res.json({ data });
      return;
    }
    await logActivity({
      userId: req.user?.id,
      module: "roles",
      action: !permissionsChanged && statusChanged
        ? input.isActive ? "activated" : "deactivated"
        : "updated",
      entityType: "role",
      entityId: id,
      details: {
        name: data.name,
        ...(permissionsChanged ? { changedModules } : {}),
        ...(permissionsChanged && statusChanged
          ? { isActive: input.isActive }
          : {}),
      },
      ipAddress: req.ip,
    });
    res.json({ data });
  } catch (error) {
    if (error instanceof roles.InvalidRolePermissionsError) {
      throw httpError(400, "One or more permissions are invalid");
    }
    if (error instanceof roles.ProtectedRoleError) {
      throw httpError(403, "The admin role cannot be modified");
    }
    throw error;
  }
};

export const destroy: RequestHandler = async (req, res) => {
  const id = roleId(req.params.id);

  try {
    const role = await roles.softDelete(id);
    if (!role) throw httpError(404, "Role not found");

    await logActivity({
      userId: req.user?.id,
      module: "roles",
      action: "deleted",
      entityType: "role",
      entityId: id,
      details: { name: role.name },
      ipAddress: req.ip,
    });
    res.status(204).end();
  } catch (error) {
    if (error instanceof roles.ProtectedRoleError) {
      throw httpError(403, "The admin role cannot be deleted");
    }
    if (error instanceof roles.RoleInUseError) {
      throw httpError(409, "Role is assigned to one or more users");
    }
    throw error;
  }
};
