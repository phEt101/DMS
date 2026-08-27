import { Router } from "express";
import { asyncHandler } from "../../../../../middleware/errors.js";
import { index, show } from "../controllers/roles.controller.js";

export const rolesRouter = Router();

rolesRouter.get("/", asyncHandler(index));
rolesRouter.get("/:id", asyncHandler(show));