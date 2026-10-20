import { Router } from "express";
import { asyncHandler } from "../../../../../middleware/errors.js";
import { requireAnyDepartmentModule, requireDepartmentModule, requirePermission } from "../../../../auth/middleware/require-authorization.middleware.js";
import {
  index,
  show,
  store,
  syncPermissions,
  destroy,
} from "../controllers/roles.controller.js";

export const rolesRouter = Router();

rolesRouter.get("/", requireAnyDepartmentModule("roles", "users"), asyncHandler(index));
rolesRouter.post("/", requireDepartmentModule("roles"), requirePermission("เพิ่มบทบาท"), asyncHandler(store));
rolesRouter.put("/:id/permissions", requireDepartmentModule("roles"), requirePermission("แก้ไขบทบาทและสิทธิ์"), asyncHandler(syncPermissions));
rolesRouter.delete("/:id", requireDepartmentModule("roles"), requirePermission("ลบบทบาท"), asyncHandler(destroy));
rolesRouter.get("/:id", requireDepartmentModule("roles"), asyncHandler(show));
