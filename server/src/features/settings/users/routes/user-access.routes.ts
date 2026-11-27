import { Router } from "express";
import { asyncHandler } from "../../../../middleware/errors.js";
import { requireAnyDepartmentModule } from "../../../auth/middleware/require-authorization.middleware.js";
import * as controller from "../controllers/user-access.controller.js";

// สิทธิ์รายบุคคล — mount ที่ /users/:id/access (ผ่าน usersRouter)
export const userAccessRouter = Router();
userAccessRouter.use(requireAnyDepartmentModule("users", "documents_employees"));
userAccessRouter.get("/:id/access", asyncHandler(controller.showAccess));
userAccessRouter.put("/:id/access", asyncHandler(controller.updateAccess));
