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

// เขียนข้อมูลพนักงาน (สร้าง/แก้ไข/ลบ):
//  - แผนกที่เข้าถึงโมดูล "users" → ต้องมีสิทธิ์เฉพาะ (สร้าง/แก้ไข/ลบผู้ใช้งาน) ด้วย
//  - แผนกที่เข้าถึงโมดูล "documents_employees" (เช่น HR Div. จากหน้าจัดการแผนก) → จัดการพนักงานผ่านหน้าจอพนักงานได้เลย
function requireEmployeeWrite(permissionName: string): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) throw httpError(401, "Authentication required");
    if (user.role.name.trim().toLowerCase() === "admin") return next();
    if (user.departmentModules.includes("documents_employees")) return next();
    if (user.departmentModules.includes("users") && user.permissions.some((permission) => permission.name === permissionName)) return next();
    throw httpError(403, "ไม่มีสิทธิ์ดำเนินการนี้");
  };
}

export const usersRouter = Router();

// ดูรายการ/รายละเอียด: แผนกที่เข้าถึงโมดูล users หรือ documents_employees (HR Div.)
usersRouter.use(requireAnyDepartmentModule("users", "documents_employees"));
usersRouter.get("/", asyncHandler(index));
usersRouter.get("/:id", asyncHandler(show));
usersRouter.post("/", requireEmployeeWrite("สร้างผู้ใช้งาน"), asyncHandler(store));
usersRouter.patch("/:id", requireEmployeeWrite("แก้ไขผู้ใช้งาน"), asyncHandler(patch));
usersRouter.delete("/:id", requireEmployeeWrite("ลบผู้ใช้งาน"), asyncHandler(destroy));
