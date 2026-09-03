import type { RequestHandler } from "express";
import { env } from "../../../config/env.js";

import { httpError } from "../../../middleware/errors.js";
import { logActivity } from "../../settings/activity/repositories/activity.repository.js";
import * as authService from "../services/auth.service.js";

interface LoginPayload {
  email: string;
  password: string;
}

function validateLoginPayload(input: unknown): LoginPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw httpError(400, "Invalid request payload");
  }

  const body = input as Record<string, unknown>;
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    throw httpError(400, "Email and password are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "Invalid email format");
  }
  if (email.length > 255 || password.length > 255) {
    throw httpError(400, "Email or password is too long");
  }

  return { email, password };
}

export const login: RequestHandler = async (req, res, next) => {
  const payload = validateLoginPayload(req.body);
  try {
    const result = await authService.login({
      email: payload.email,
      password: payload.password,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")?.slice(0, 500) ?? null,
    });

    await logActivity({
      userId: result.user.id,
      module: "authentication",
      action: "login",
      entityType: "authentication",
      entityId: result.user.id,
      details: {
        userAgent: req.get("User-Agent")?.slice(0, 500) ?? "",
      },
      ipAddress: req.ip,
    });

    res.cookie(authService.SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: env.nodeEnv !== "development",
      sameSite: "lax",
      expires: result.expiresAt,
      path: "/",
    });

    res.json({
      data: result.user,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    if (error instanceof authService.AuthenticationError) {
      return next(httpError(401, error.message));
    }
    next(error);
  }
};

export const me: RequestHandler = (req, res) => {
  if (!req.user) {
    throw httpError(401, "Authentication required");
  }

  res.json({
    data: req.user,
  });
};

export const logout: RequestHandler = async (req, res) => {
  if (!req.user || req.sessionId === undefined) {
    throw httpError(401, "Authentication required");
  }

  await authService.logout(req.sessionId);

  await logActivity({
    userId: req.user.id,
    module: "authentication",
    action: "logout",
    entityType: "authentication",
    entityId: req.user.id,
    ipAddress: req.ip,
  });

  res.clearCookie(authService.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv !== "development",
    sameSite: "lax",
    path: "/",
  });

  res.status(204).end();
};
