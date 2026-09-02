import { db } from "../../../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export interface AuthUserRow extends RowDataPacket {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string;
  isActive: boolean;
  roleId: number;
  roleName: string;
  roleIsActive: boolean;
}

export interface CreateSessionInput {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthSessionRow extends RowDataPacket {
  sessionId: number;
  expiresAt: Date;
  lastUsedAt: Date | null;
  userId: number;
  email: string;
  name: string;
  userIsActive: boolean;
  roleId: number;
  roleName: string;
  roleIsActive: boolean;
}

export async function findUserByEmail(
  email: string,
): Promise<AuthUserRow | null> {
  const [rows] = await db.execute<AuthUserRow[]>(
    `SELECT 
            users.id, 
            users.email, 
            users.password_hash AS passwordHash,
            users.name,
            users.is_active AS isActive,
            roles.id AS roleId,
            roles.name AS roleName,
            roles.is_active AS roleIsActive
        FROM users
        INNER JOIN roles 
            ON roles.id = users.role_id
        WHERE users.email = ? 
            AND users.deleted_at IS NULL
            AND roles.deleted_at IS NULL
        LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<number> {
  const { userId, tokenHash, expiresAt, ipAddress, userAgent } = input;
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO user_sessions (
        user_id, 
        token_hash, 
        expires_at, 
        ip_address, 
        user_agent
    )
    VALUES (?, ?, ?, ?, ?)`,
    [userId, tokenHash, expiresAt, ipAddress, userAgent],
  );
  return result.insertId;
}

export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<AuthSessionRow | null> {
  const [rows] = await db.execute<AuthSessionRow[]>(
    `SELECT
       user_sessions.id AS sessionId,
       user_sessions.expires_at AS expiresAt,
       user_sessions.last_used_at AS lastUsedAt,

       users.id AS userId,
       users.email,
       users.name,
       users.is_active AS userIsActive,

       roles.id AS roleId,
       roles.name AS roleName,
       roles.is_active AS roleIsActive

     FROM user_sessions

     INNER JOIN users
       ON users.id = user_sessions.user_id

     INNER JOIN roles
       ON roles.id = users.role_id

     WHERE user_sessions.token_hash = ?
       AND user_sessions.revoked_at IS NULL
       AND user_sessions.expires_at > CURRENT_TIMESTAMP
       AND users.deleted_at IS NULL
       AND roles.deleted_at IS NULL

     LIMIT 1`,
    [tokenHash],
  );

  return rows[0] ?? null;
}

export async function updateSessionLastUsed(
  sessionId: number,
): Promise<void> {
  await db.execute(
    `UPDATE user_sessions
     SET last_used_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND revoked_at IS NULL`,
    [sessionId],
  );
}

export async function revokeSession(
  sessionId: number,
): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE user_sessions
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND revoked_at IS NULL`,
    [sessionId],
  );

  return result.affectedRows > 0;
}