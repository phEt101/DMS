import { Router } from "express";
import { asyncHandler } from "../../../../../middleware/errors.js";
import {
  destroy,
  index,
  me,
  patch,
  show,
  store,
} from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", asyncHandler(index));
usersRouter.get("/me", asyncHandler(me));
usersRouter.get("/:id", asyncHandler(show));
usersRouter.post("/", asyncHandler(store));
usersRouter.patch("/:id", asyncHandler(patch));
usersRouter.delete("/:id", asyncHandler(destroy));
