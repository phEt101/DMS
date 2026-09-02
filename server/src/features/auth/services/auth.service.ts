import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import * as authRepository from "../repositories/auth.repository.js";

export const SESSION_COOKIE_NAME = "dms_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const BCRYPT_ROUNDS = 12;

const dummyPasswordHashPromise = bcrypt.hash(
  randomBytes(32).toString("hex"),
  BCRYPT_ROUNDS,
);

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: {
    id: number;
    name: string;
  };
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: AuthenticatedUser;
}

export class AuthenticationError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "AuthenticationError";
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();

  const user = await authRepository.findUserByEmail(email);

  const passwordHash = user?.passwordHash ?? (await dummyPasswordHashPromise);

  const passwordMatches = await bcrypt.compare(input.password, passwordHash);
  const canLogin =
    user !== null &&
    user.passwordHash !== null &&
    passwordMatches &&
    Boolean(user.isActive) &&
    Boolean(user.roleIsActive);

  if (!canLogin) {
    throw new AuthenticationError();
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = createSessionExpiry();

  await authRepository.createSession({
    userId: user.id,
    tokenHash,
    expiresAt,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: {
        id: user.roleId,
        name: user.roleName,
      },
    },
  };
}
