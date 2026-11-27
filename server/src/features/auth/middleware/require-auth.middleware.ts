import type { RequestHandler } from "express";

import { httpError } from "../../../middleware/errors.js";
import * as authRepository from "../repositories/auth.repository.js";
import { avatarUrlOf } from "../../settings/users/middleware/avatar-upload.middleware.js";
import {
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "../services/auth.service.js";

const LAST_USED_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export const requireAuth: RequestHandler = async (
  req,
  _res,
  next,
) => {
  const token: unknown =
    req.cookies?.[SESSION_COOKIE_NAME];

  if (
    typeof token !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(token)
  ) {
    throw httpError(401, "Authentication required");
  }

  const tokenHash = hashSessionToken(token);

  const session =
    await authRepository.findSessionByTokenHash(tokenHash);

  const isAuthenticated =
    session !== null &&
    Boolean(session.userIsActive) &&
    Boolean(session.roleIsActive);

  if (!isAuthenticated) {
    throw httpError(401, "Invalid or expired session");
  }

  const permissions = await authRepository.findEffectivePermissionsByUserId(
    session.roleId,
    session.userId,
  );
  const departmentModules = await authRepository.findEffectiveModuleNames(session.departmentId, session.userId);

  const userCompany = { id: session.companyId, name: session.companyName, logoUrl: session.companyLogoUrl };
  const managementCompanyHeader = req.get("X-Management-Company-Id");
  if (session.roleName.trim().toLowerCase() === "admin" && managementCompanyHeader !== undefined) {
    const managementCompanyId = Number(managementCompanyHeader);
    if (Number.isSafeInteger(managementCompanyId) && managementCompanyId > 0) {
      const managementCompany = await authRepository.findActiveCompanyById(managementCompanyId);
      if (managementCompany) {
        userCompany.id = managementCompany.id;
        userCompany.name = managementCompany.name;
        userCompany.logoUrl = managementCompany.logoUrl;
      }
    }
  }

  req.user = {
    id: session.userId,
    email: session.email,
    name: session.name,
    avatarUrl: avatarUrlOf(session.avatarPath),
    company: userCompany,
    department: session.departmentName,
    departmentModules,
    role: {
      id: session.roleId,
      name: session.roleName,
    },
    permissions,
  };

  req.sessionId = session.sessionId;

  const shouldUpdateLastUsed =
    session.lastUsedAt === null ||
    Date.now() - session.lastUsedAt.getTime() >=
      LAST_USED_UPDATE_INTERVAL_MS;

  if (shouldUpdateLastUsed) {
    await authRepository.updateSessionLastUsed(
      session.sessionId,
    );
  }

  next();
};
