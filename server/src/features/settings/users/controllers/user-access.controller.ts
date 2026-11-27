import type { RequestHandler } from "express";
import { httpError } from "../../../../middleware/errors.js";
import * as authRepository from "../../../auth/repositories/auth.repository.js";
import * as modulesRepository from "../../access/modules/repositories/modules.repository.js";
import { db } from "../../../../config/database.js";
import type { RowDataPacket } from "mysql2/promise";
import { logActivity } from "../../activity/repositories/activity.repository.js";

// สิทธิ์รายบุคคล (User Access) — ดู/ตั้งค่า หน้าจอ + สิทธิ์ที่เพิ่ม/ถอดเฉพาะคนนั้น
// จัดการได้เฉพาะ role admin เท่านั้น

function routeParam(value: string | string[] | undefined): string {
  if (typeof value !== "string") throw httpError(400, "Invalid route parameter");
  return value;
}

function isAdmin(user: { role?: { name?: string } } | undefined) {
  return user?.role?.name?.trim().toLowerCase() === "admin";
}

function canManageUserAccess(user: { role?: { name?: string }; departmentModules?: string[]; permissions?: Array<{ name: string }> } | undefined) {
  if (!user) return false;
  return isAdmin(user);
}

function positiveIdArray(value: unknown, label: string): number[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => !Number.isSafeInteger(Number(item)) || Number(item) < 1)) {
    throw httpError(400, `${label} must be an array of positive integers`);
  }
  return (value as unknown[]).map((item) => Number(item));
}

/** GET /users/:id/access — สิทธิ์พื้นฐานจากบทบาท/แผนก + override รายบุคคล */
export const showAccess: RequestHandler = async (req, res) => {
  const requester = req.user;
  if (!canManageUserAccess(requester)) throw httpError(403, "ไม่มีสิทธิ์จัดการสิทธิ์รายบุคคล");

  const userId = routeParam(req.params.id);
  const [userRows] = await db.query<(RowDataPacket & {
    id: number; name: string; email: string; role: string; roleActive: boolean;
    roleId: number; department: string | null; departmentId: number | null; companyId: number;
    company: string; isActive: boolean;
  })[]>(
    `SELECT users.id, users.name, users.email, roles.name AS role, roles.is_active AS roleActive,
            roles.id AS roleId, departments.name AS department, departments.id AS departmentId,
            users.company_id AS companyId, companies.name AS company, users.is_active AS isActive
       FROM users
       INNER JOIN roles ON roles.id = users.role_id
       LEFT JOIN departments ON departments.id = users.department_id
       INNER JOIN companies ON companies.id = users.company_id
      WHERE users.id = ? AND users.deleted_at IS NULL LIMIT 1`,
    [userId],
  );
  const user = userRows[0];
  if (!user) throw httpError(404, "User not found");

  const baseModules = await authRepository.findActiveModuleNamesByDepartmentId(user.departmentId ? Number(user.departmentId) : null);
  const basePermissions = await authRepository.findActivePermissionsByRoleId(Number(user.roleId));
  const overrides = await authRepository.findUserAccessOverrides(Number(userId));
  const effectiveModules = await authRepository.findEffectiveModuleNames(user.departmentId ? Number(user.departmentId) : null, Number(userId));
  const effectivePermissions = await authRepository.findEffectivePermissionsByUserId(Number(user.roleId), Number(userId));

  const modules = await modulesRepository.findAll();
  const [permissionRows] = await db.query<(RowDataPacket & { id: number; name: string; module: string; moduleId: number; isActive: number })[]>(
    `SELECT permissions.id, permissions.name, permission_modules.name AS module, permissions.module_id AS moduleId, permissions.is_active AS isActive
       FROM permissions
       INNER JOIN permission_modules ON permission_modules.id = permissions.module_id
      WHERE permissions.deleted_at IS NULL AND permission_modules.deleted_at IS NULL
      ORDER BY permission_modules.sort_order, permissions.id`,
  );

  res.json({
    data: {
      user: {
        id: Number(user.id), name: user.name, email: user.email, role: user.role,
        department: user.department, company: user.company, isActive: Boolean(user.isActive),
      },
      modules: modules.map((module) => ({
        id: module.id, name: module.name, isActive: Boolean(module.isActive),
        // สิทธิ์เดิมจากแผนก / เพิ่มพิเศษ / ถอดพิเศษ / ผลรวมที่คนนี้เห็นจริง
        base: baseModules.includes(module.name),
        granted: overrides.moduleGrants.includes(module.id),
        denied: overrides.moduleDenies.includes(module.id),
        effective: effectiveModules.includes(module.name),
      })),
      permissions: permissionRows.map((row) => ({
        id: Number(row.id), name: row.name, module: row.module, isActive: Boolean(Number(row.isActive)),
        base: basePermissions.some((permission) => permission.name === row.name),
        granted: overrides.permissionGrants.includes(Number(row.id)),
        denied: overrides.permissionDenies.includes(Number(row.id)),
        effective: effectivePermissions.some((permission) => permission.name === row.name),
      })),
    },
  });
};

/** PUT /users/:id/access — บันทึก override รายบุคคล (ส่ง list ทั้งหมด, เขียนทับ) */
export const updateAccess: RequestHandler = async (req, res) => {
  const requester = req.user;
  if (!canManageUserAccess(requester)) throw httpError(403, "ไม่มีสิทธิ์จัดการสิทธิ์รายบุคคล");

  const userId = routeParam(req.params.id);
  const [userRows] = await db.query<(RowDataPacket & { id: number; name: string; companyId: number; roleId: number })[]>(
    `SELECT users.id, users.name, users.company_id AS companyId, users.role_id AS roleId
       FROM users WHERE users.id = ? AND users.deleted_at IS NULL LIMIT 1`,
    [userId],
  );
  const user = userRows[0];
  if (!user) throw httpError(404, "User not found");

  const body = (req.body ?? {}) as Record<string, unknown>;
  const moduleGrants = positiveIdArray(body.moduleGrants, "moduleGrants");
  const moduleDenies = positiveIdArray(body.moduleDenies, "moduleDenies");
  const permissionGrants = positiveIdArray(body.permissionGrants, "permissionGrants");
  const permissionDenies = positiveIdArray(body.permissionDenies, "permissionDenies");

  // ตรวจว่า id ที่ส่งมามีจริงในระบบ (ป้องกัน FK error คาใจ)
  const [moduleRows] = await db.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM permission_modules WHERE deleted_at IS NULL AND id IN (${[...new Set([...moduleGrants, ...moduleDenies])].map(() => "?").join(",") || "NULL"})`,
    [...new Set([...moduleGrants, ...moduleDenies])],
  );
  const knownModuleIds = new Set(moduleRows.map((row) => Number(row.id)));
  for (const id of [...moduleGrants, ...moduleDenies]) if (!knownModuleIds.has(id)) throw httpError(400, "Invalid module id");

  const [permissionRows] = await db.query<(RowDataPacket & { id: number })[]>(
    `SELECT id FROM permissions WHERE deleted_at IS NULL AND id IN (${[...new Set([...permissionGrants, ...permissionDenies])].map(() => "?").join(",") || "NULL"})`,
    [...new Set([...permissionGrants, ...permissionDenies])],
  );
  const knownPermissionIds = new Set(permissionRows.map((row) => Number(row.id)));
  for (const id of [...permissionGrants, ...permissionDenies]) if (!knownPermissionIds.has(id)) throw httpError(400, "Invalid permission id");

  // ถ้าจัดการโดยไม่ใช่ admin ต้องอยู่บริษัทเดียวกัน
  if (!isAdmin(requester) && requester && Number(requester.company.id) !== Number(user.companyId)) {
    throw httpError(403, "จัดการได้เฉพาะผู้ใช้งานในบริษัทเดียวกัน");
  }

  // กันล็อกตัวเอง: ถอดสิทธิ์จัดการสิทธิ์รายบุคคลของตัวเองไม่ได้
  if (requester && Number(requester.id) === Number(userId) && !isAdmin(requester)) {
    throw httpError(403, "ไม่สามารถแก้ไขสิทธิ์ของตนเองได้");
  }

  await authRepository.setUserAccessOverrides(Number(userId), {
    moduleGrants: [...new Set(moduleGrants)],
    moduleDenies: [...new Set(moduleDenies)],
    permissionGrants: [...new Set(permissionGrants)],
    permissionDenies: [...new Set(permissionDenies)],
  });

  await logActivity({
    userId: requester?.id,
    module: "users",
    action: "updated",
    entityType: "user_access",
    entityId: Number(userId),
    details: {
      name: String(user.name),
      moduleGrants: [...new Set(moduleGrants)], moduleDenies: [...new Set(moduleDenies)],
      permissionGrants: [...new Set(permissionGrants)], permissionDenies: [...new Set(permissionDenies)],
    },
    ipAddress: req.ip,
  });

  res.json({ data: { saved: true } });
};
