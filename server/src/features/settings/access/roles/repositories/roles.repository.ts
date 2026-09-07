import { db } from "../../../../../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export interface RoleCreateInput {
  name: string;
  description: string | null;
  isActive: boolean;
  permissionIds: number[];
}

export class InvalidRolePermissionsError extends Error {}

export class ProtectedRoleError extends Error {}

export class RoleInUseError extends Error {}

export interface RoleRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  userCount: number;
  permissionCount: number;
}

export interface RolePermissionRow extends RowDataPacket {
  id: number;
  name: string;
  module: string;
  isActive: boolean;
  isAssigned: boolean;
}

interface RolePermissionMappingRow extends RolePermissionRow {
  roleId: number;
}

export interface RoleDetails extends RoleRow {
  permissions: RolePermissionRow[];
}

export async function findAll(): Promise<RoleDetails[]> {
  const [roles] = await db.execute<RoleRow[]>(`
            SELECT
                roles.id, 
                roles.name, 
                roles.description, 
                roles.is_active AS isActive, 
                roles.created_at AS createdAt,
                roles.updated_at AS updatedAt, 
                roles.deleted_at AS deletedAt,
                
                COUNT(DISTINCT users.id) AS userCount,
                COUNT(DISTINCT assigned_permissions.id) AS permissionCount
            FROM roles
            LEFT JOIN users 
                ON users.role_id = roles.id 
                AND users.deleted_at IS NULL
            LEFT JOIN role_permissions 
                ON role_permissions.role_id = roles.id
            LEFT JOIN permissions AS assigned_permissions
                ON assigned_permissions.id = role_permissions.permission_id
                AND assigned_permissions.deleted_at IS NULL
            
            WHERE roles.deleted_at IS NULL

            GROUP BY roles.id,
                roles.name,
                roles.description,
                roles.is_active,
                roles.created_at,
                roles.updated_at,
                roles.deleted_at
            ORDER BY roles.name ASC
    `);
  const [permissionRows] = await db.execute<RolePermissionMappingRow[]>(
    `SELECT
                    roles.id AS roleId,

                    permissions.id,
                    permissions.name,
                    permission_modules.name AS module,
                    permissions.is_active AS isActive,
                    CASE
                        WHEN role_permissions.permission_id IS NULL THEN 0
                        ELSE 1
                    END AS isAssigned

                FROM roles
                CROSS JOIN permissions
                INNER JOIN permission_modules
                    ON permission_modules.id = permissions.module_id
                LEFT JOIN role_permissions
                    ON role_permissions.role_id = roles.id
                    AND role_permissions.permission_id = permissions.id

                WHERE roles.deleted_at IS NULL
                    AND permissions.deleted_at IS NULL

                ORDER BY
                    role_permissions.role_id,
                    permission_modules.sort_order,
                    permission_modules.name,
                    permissions.name
    `,
  );

  const permissionsByRole = new Map<number, RolePermissionRow[]>();
  for (const row of permissionRows) {
    const currentPermissions = permissionsByRole.get(row.roleId) ?? [];
    currentPermissions.push({
      id: row.id,
      name: row.name,
      module: row.module,
      isActive: row.isActive,
      isAssigned: row.isAssigned,
    } as RolePermissionRow);
    permissionsByRole.set(row.roleId, currentPermissions);
  }

  return roles.map((role) => ({
    ...role,
    permissions: permissionsByRole.get(role.id) ?? [],
  }));
}

export async function findById(id: string): Promise<RoleDetails | null> {
  const [roleRows] = await db.execute<RoleRow[]>(
    `SELECT
        roles.id,
        roles.name,
        roles.description,
        roles.is_active AS isActive,
        roles.created_at AS createdAt,
        roles.updated_at AS updatedAt,
        roles.deleted_at AS deletedAt,

        COUNT(DISTINCT users.id) AS userCount,
        COUNT(DISTINCT role_permissions.permission_id) AS permissionCount
  
    FROM roles

    LEFT JOIN users 
        ON users.role_id = roles.id 
        AND users.deleted_at IS NULL

    LEFT JOIN role_permissions 
        ON role_permissions.role_id = roles.id

    WHERE roles.id = ? AND roles.deleted_at IS NULL

    GROUP BY 
        roles.id,
        roles.name,
        roles.description,
        roles.is_active,
        roles.created_at,
        roles.updated_at,
        roles.deleted_at
    
    LIMIT 1`,
    [id],
  );
  const role = roleRows[0];
  if (!role) {
    return null;
  }

  const [permissions] = await db.execute<RolePermissionRow[]>(
    `SELECT
        permissions.id,
        permissions.name,
        permission_modules.name AS module,
        permissions.is_active AS isActive,
        1 AS isAssigned

    FROM role_permissions
    INNER JOIN permissions 
        ON permissions.id = role_permissions.permission_id
    INNER JOIN permission_modules
        ON permission_modules.id = permissions.module_id

    WHERE role_permissions.role_id = ?
        AND permissions.deleted_at IS NULL
        
    ORDER BY 
        permission_modules.sort_order,
        permission_modules.name,
        permissions.name`,
    [id],
  );

  return { ...role, permissions };
}

export async function nameExists(name: string): Promise<boolean> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT id
     FROM roles
     WHERE name = ?
     LIMIT 1`,
    [name],
  );

  return rows.length > 0;
}

export async function create(input: RoleCreateInput): Promise<RoleDetails> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO roles (name, description, is_active)
       VALUES (?, ?, ?)`,
      [input.name, input.description, input.isActive],
    );

    if (input.permissionIds.length > 0) {
      const placeholders = input.permissionIds.map(() => "?").join(", ");
      const [permissionRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id
         FROM permissions
         WHERE id IN (${placeholders})
           AND is_active = 1
           AND deleted_at IS NULL`,
        input.permissionIds,
      );

      if (permissionRows.length !== input.permissionIds.length) {
        throw new InvalidRolePermissionsError();
      }

      const values = input.permissionIds.flatMap((permissionId) => [
        result.insertId,
        permissionId,
      ]);
      const valuePlaceholders = input.permissionIds
        .map(() => "(?, ?)")
        .join(", ");

      await connection.execute(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ${valuePlaceholders}`,
        values,
      );
    }

    await connection.commit();

    const role = await findById(String(result.insertId));
    if (!role) throw new Error("Created role could not be loaded");
    return role;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function syncPermissions(
  id: string,
  permissionIds: number[],
  isActive: boolean,
): Promise<RoleDetails | null> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [roleRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, name
       FROM roles
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [id],
    );
    if (!roleRows[0]) {
      await connection.rollback();
      return null;
    }
    const nextIsActive = String(roleRows[0].name).trim().toLowerCase() === "admin"
      ? true
      : isActive;

    if (permissionIds.length > 0) {
      const placeholders = permissionIds.map(() => "?").join(", ");
      const [permissionRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id
         FROM permissions
         WHERE id IN (${placeholders})
           AND is_active = 1
           AND deleted_at IS NULL`,
        permissionIds,
      );
      if (permissionRows.length !== permissionIds.length) {
        throw new InvalidRolePermissionsError();
      }
    }

    await connection.execute(
      `DELETE FROM role_permissions WHERE role_id = ?`,
      [id],
    );

    await connection.execute(
      `UPDATE roles SET is_active = ? WHERE id = ?`,
      [nextIsActive, id],
    );

    if (permissionIds.length > 0) {
      const values = permissionIds.flatMap((permissionId) => [id, permissionId]);
      const placeholders = permissionIds.map(() => "(?, ?)").join(", ");
      await connection.execute(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ${placeholders}`,
        values,
      );
    }

    await connection.commit();
    return findById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function softDelete(id: string): Promise<RoleRow | null> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [roleRows] = await connection.execute<RoleRow[]>(
      `SELECT
         roles.id,
         roles.name,
         roles.description,
         roles.is_active AS isActive,
         roles.created_at AS createdAt,
         roles.updated_at AS updatedAt,
         roles.deleted_at AS deletedAt,
         (SELECT COUNT(*) FROM users
          WHERE users.role_id = roles.id AND users.deleted_at IS NULL) AS userCount,
         (SELECT COUNT(*) FROM role_permissions
          WHERE role_permissions.role_id = roles.id) AS permissionCount
       FROM roles
       WHERE roles.id = ? AND roles.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [id],
    );
    const role = roleRows[0];
    if (!role) {
      await connection.rollback();
      return null;
    }

    if (role.name.trim().toLowerCase() === "admin") {
      throw new ProtectedRoleError();
    }
    if (Number(role.userCount) > 0) {
      throw new RoleInUseError();
    }

    await connection.execute(
      `UPDATE roles
       SET is_active = 0, deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    await connection.commit();
    return role;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
