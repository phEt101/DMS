import { Router } from "express";

import { asyncHandler } from "../../../middleware/errors.js";
import { login, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/require-auth.middleware.js";
import { loginRateLimiter } from "../middleware/login-rate-limit.middleware.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, asyncHandler(login));
authRouter.get("/me", asyncHandler(requireAuth), me);
