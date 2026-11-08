import { Router, type RequestHandler } from "express";
import { asyncHandler, httpError } from "../../../../middleware/errors.js";
import { requireAnyDepartmentModule } from "../../../auth/middleware/require-authorization.middleware.js";
import {
  destroy,
  index,
  patch,
  show,
  store,
} from "../controllers/users.controller.js";

// เขียนข้อมูลพนักงาน: หน้าจอ users ใช้สิทธิ์เดิม ส่วนหน้าจอเอกสารใช้สิทธิ์แยกตามการกระทำ
function requireEmployeeWrite(permissionName: string, documentPermissionName = permissionName): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) throw httpError(401, "Authentication required");
    if (user.role.name.trim().toLowerCase() === "admin") return next();
    const hasPermission = (name: string) => user.permissions.some((permission) => permission.name === name);
    if (user.departmentModules.includes("documents_employees") && hasPermission(documentPermissionName)) return next();
    if (user.departmentModules.includes("users") && hasPermission(permissionName)) return next();
    throw httpError(403, "ไม่มีสิทธิ์ดำเนินการนี้");
  };
}

const requireAdminForAdminRole: RequestHandler = (req, _res, next) => {
  const user = req.user;
  if (!user) throw httpError(401, "Authentication required");
  const requestedRole = req.body?.role;
  if (
    user.role.name.trim().toLowerCase() !== "admin" &&
    typeof requestedRole === "string" &&
    requestedRole.trim().toLowerCase() === "admin"
  ) {
    throw httpError(403, "ไม่มีสิทธิ์กำหนดบทบาท admin");
  }
  next();
};

export const usersRouter = Router();

// ดูรายการ/รายละเอียด: แผนกที่เข้าถึงโมดูล users หรือ documents_employees (HR Div.)
usersRouter.use(requireAnyDepartmentModule("users", "documents_employees"));
usersRouter.get("/", asyncHandler(index));
usersRouter.get("/:id", asyncHandler(show));
usersRouter.post("/", requireEmployeeWrite("สร้างผู้ใช้งาน", "เพิ่มข้อมูลพนักงาน"), requireAdminForAdminRole, asyncHandler(store));
usersRouter.patch("/:id", requireEmployeeWrite("แก้ไขผู้ใช้งาน", "แก้ไขข้อมูลพนักงาน"), requireAdminForAdminRole, asyncHandler(patch));
usersRouter.delete("/:id", requireEmployeeWrite("ลบผู้ใช้งาน"), asyncHandler(destroy));
