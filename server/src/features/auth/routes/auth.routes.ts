import { Router } from "express";

import { asyncHandler } from "../../../middleware/errors.js";
import { changePassword, login, logout, me, updateProfile } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/require-auth.middleware.js";
import { loginRateLimiter } from "../middleware/login-rate-limit.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, asyncHandler(login));
authRouter.post("/logout", asyncHandler(requireAuth), asyncHandler(logout));
authRouter.get("/me", asyncHandler(requireAuth), me);
authRouter.patch("/profile", asyncHandler(requireAuth), asyncHandler(updateProfile));
authRouter.post("/password", asyncHandler(requireAuth), asyncHandler(changePassword));
