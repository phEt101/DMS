import { db } from "../../../../../config/database.js";
import type { RowDataPacket } from "mysql2/promise";

export interface RoleRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
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
  description: string | null;
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
                roles.is_system AS isSystem,
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
                roles.is_system,
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
                    permissions.description,
                    permissions.module,
                    permissions.is_active AS isActive,
                    CASE
                        WHEN role_permissions.permission_id IS NULL THEN 0
                        ELSE 1
                    END AS isAssigned

                FROM roles
                CROSS JOIN permissions
                LEFT JOIN role_permissions
                    ON role_permissions.role_id = roles.id
                    AND role_permissions.permission_id = permissions.id

                WHERE roles.deleted_at IS NULL
                    AND permissions.deleted_at IS NULL

                ORDER BY
                    role_permissions.role_id,
                    permissions.module,
                    permissions.name
    `,
  );

  const permissionsByRole = new Map<number, RolePermissionRow[]>();
  for (const row of permissionRows) {
    const currentPermissions = permissionsByRole.get(row.roleId) ?? [];
    currentPermissions.push({
      id: row.id,
      name: row.name,
      description: row.description,
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
        roles.is_system AS isSystem,
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
        roles.is_system,
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
        permissions.description,
        permissions.module,
        permissions.is_active AS isActive,
        1 AS isAssigned

    FROM role_permissions
    INNER JOIN permissions 
        ON permissions.id = role_permissions.permission_id

    WHERE role_permissions.role_id = ?
        AND permissions.deleted_at IS NULL
        
    ORDER BY 
        permissions.module,
        permissions.name`,
    [id],
  );

  return { ...role, permissions };
}
