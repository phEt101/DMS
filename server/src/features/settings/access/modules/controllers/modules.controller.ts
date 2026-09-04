import type { RequestHandler } from "express";
import { httpError } from "../../../../../middleware/errors.js";
import { logActivity } from "../../../activity/repositories/activity.repository.js";
import * as modules from "../repositories/modules.repository.js";
import type { PermissionModuleInput } from "../repositories/modules.repository.js";

function id(value: string | string[] | undefined) {
  if (typeof value !== "string") throw httpError(400, "Invalid module id");
  return value;
}

function validate(body: unknown, partial = false): PermissionModuleInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "Request body must be an object");
  }
  const input = body as Record<string, unknown>;
  const output: PermissionModuleInput = {};
  if (!partial || Object.hasOwn(input, "name")) {
    const name = typeof input.name === "string" ? input.name.trim().toLowerCase() : "";
    if (!name || name.length > 80) throw httpError(400, "Valid module name is required");
    output.name = name;
  }
  if (!partial || Object.hasOwn(input, "iconName")) {
    const iconName = typeof input.iconName === "string" ? input.iconName.trim() : input.iconName;
    if (iconName === null || iconName === "") {
      output.iconName = null;
    } else if (typeof iconName !== "string" || !/^Fa[A-Z][A-Za-z0-9]*$/.test(iconName) || iconName.length > 100) {
      throw httpError(400, "Valid react-icons Fa6 icon name is required");
    } else {
      output.iconName = iconName;
    }
  }
  if (!partial || Object.hasOwn(input, "sortOrder")) {
    const sortOrder = Number(input.sortOrder ?? 0);
    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) throw httpError(400, "Invalid sortOrder");
    output.sortOrder = sortOrder;
  }
  if (Object.hasOwn(input, "isActive")) {
    if (typeof input.isActive !== "boolean") throw httpError(400, "isActive must be a boolean");
    output.isActive = input.isActive;
  } else if (!partial) output.isActive = true;
  return output;
}

function collectChanges(current: modules.PermissionModuleRow, input: PermissionModuleInput) {
  return (Object.keys(input) as Array<keyof PermissionModuleInput>).flatMap((field) => {
    const from = field === "isActive" ? Boolean(current[field]) : current[field];
    const to = field === "isActive" ? Boolean(input[field]) : input[field];
    return from === to ? [] : [{ field, from, to }];
  });
}

export const index: RequestHandler = async (_req, res) => {
  res.json({ data: await modules.findAll() });
};

export const store: RequestHandler = async (req, res) => {
  const input = validate(req.body) as Required<PermissionModuleInput>;
  if (await modules.findDuplicate(input.name)) throw httpError(409, "Module name already exists");
  const data = await modules.create(input);
  await logActivity({
    userId: req.user?.id,
    module: "modules",
    action: "created",
    entityType: "module",
    entityId: data?.id,
    details: { name: data?.name ?? input.name },
    ipAddress: req.ip,
  });
  res.status(201).json({ data });
};

export const patch: RequestHandler = async (req, res) => {
  const moduleId = id(req.params.id);
  const current = await modules.findById(moduleId);
  if (!current) throw httpError(404, "Module not found");
  const input = validate(req.body, true);
  if (input.name && await modules.findDuplicate(input.name, moduleId)) throw httpError(409, "Module name already exists");
  const changes = collectChanges(current, input);
  const data = await modules.update(moduleId, input);
  if (changes.length > 0) {
    const statusChange = changes.length === 1 && changes[0]?.field === "isActive";
    await logActivity({
      userId: req.user?.id,
      module: "modules",
      action: statusChange ? Boolean(changes[0]?.to) ? "activated" : "deactivated" : "updated",
      entityType: "module",
      entityId: moduleId,
      details: { name: data?.name ?? current.name, changes },
      ipAddress: req.ip,
    });
  }
  res.json({ data });
};

export const destroy: RequestHandler = async (req, res) => {
  const moduleId = id(req.params.id);
  const current = await modules.findById(moduleId);
  if (!current) throw httpError(404, "Module not found");
  if (current.permissionCount > 0) throw httpError(409, "Module is assigned to permissions");
  if (!(await modules.softDelete(moduleId))) throw httpError(404, "Module not found");
  await logActivity({
    userId: req.user?.id,
    module: "modules",
    action: "deleted",
    entityType: "module",
    entityId: moduleId,
    details: { name: current.name },
    ipAddress: req.ip,
  });
  res.status(204).end();
};
