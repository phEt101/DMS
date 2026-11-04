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
  if (!/^\S+@\S+\.\S+$/.test(email)) {
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
      secure: env.cookieSecure,
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
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
  });

  res.status(204).end();
};

function readBody(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw httpError(400, "Invalid request payload");
  }
  return input as Record<string, unknown>;
}

export const updateProfile: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, "Authentication required");

  const body = readBody(req.body);
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (!firstName) throw httpError(400, "First name is required");
  if (firstName.length > 150 || lastName.length > 150 || `${firstName} ${lastName}`.trim().length > 150) {
    throw httpError(400, "Full name is too long");
  }

  const previousName = req.user.name;
  const name = await authService.updateOwnProfile(req.user.id, firstName, lastName);

  await logActivity({
    userId: req.user.id,
    module: "authentication",
    action: "profile_updated",
    entityType: "user",
    entityId: req.user.id,
    details: { name, previousName },
    ipAddress: req.ip,
  });

  res.json({ data: { ...req.user, name } });
};

export const changePassword: RequestHandler = async (req, res, next) => {
  if (!req.user || req.sessionId === undefined) throw httpError(401, "Authentication required");

  const body = readBody(req.body);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) throw httpError(400, "Current and new password are required");
  if (newPassword.length < 8) throw httpError(400, "Password must be at least 8 characters");
  if (newPassword.length > 255 || currentPassword.length > 255) throw httpError(400, "Password is too long");
  if (newPassword === currentPassword) throw httpError(400, "New password must differ from current password");

  try {
    await authService.changeOwnPassword(req.user.id, req.sessionId, currentPassword, newPassword);
  } catch (error) {
    if (error instanceof authService.InvalidCurrentPasswordError) {
      return next(httpError(400, error.message));
    }
    return next(error);
  }

  await logActivity({
    userId: req.user.id,
    module: "authentication",
    action: "password_changed",
    entityType: "user",
    entityId: req.user.id,
    ipAddress: req.ip,
  });

  res.status(204).end();
};
