import { Router } from "express";
import { asyncHandler } from "../../../../middleware/errors.js";
import { requireDepartmentModule, requirePermission } from "../../../auth/middleware/require-authorization.middleware.js";
import {
  destroy,
  index,
  patch,
  show,
  store,
} from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.use(requireDepartmentModule("users"));
usersRouter.get("/", asyncHandler(index));
usersRouter.get("/:id", asyncHandler(show));
usersRouter.post("/", requirePermission("สร้างผู้ใช้งาน"), asyncHandler(store));
usersRouter.patch("/:id", requirePermission("แก้ไขผู้ใช้งาน"), asyncHandler(patch));
usersRouter.delete("/:id", requirePermission("ลบผู้ใช้งาน"), asyncHandler(destroy));
