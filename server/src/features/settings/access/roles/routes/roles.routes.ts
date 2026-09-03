import { Router } from "express";
import { asyncHandler } from "../../../../../middleware/errors.js";
import {
  index,
  show,
  store,
  syncPermissions,
  destroy,
} from "../controllers/roles.controller.js";

export const rolesRouter = Router();

rolesRouter.get("/", asyncHandler(index));
rolesRouter.post("/", asyncHandler(store));
rolesRouter.put("/:id/permissions", asyncHandler(syncPermissions));
rolesRouter.delete("/:id", asyncHandler(destroy));
rolesRouter.get("/:id", asyncHandler(show));
