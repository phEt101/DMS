import { request } from '../../../../../services/api'
import type { Permission } from '../../permissions/services/permissions.service'

export type Role = { id: number; name: string; description: string | null; isActive: boolean | number; createdAt: string; updatedAt: string; deletedAt: string | null; userCount: number; permissionCount: number }
export type RolePermission = Pick<Permission, 'id' | 'name' | 'module' | 'isActive'> & { isAssigned: boolean | number }
export type RoleDetails = Role & { permissions: RolePermission[] }
export type RoleInput = { name: string; description: string; isActive: boolean; permissionIds: number[] }

export function listRoles() { return request("/roles") as Promise<{ data: RoleDetails[] }> }
export function createRole(input: RoleInput) { return request("/roles", { method: "POST", body: JSON.stringify(input) }) as Promise<{ data: RoleDetails }> }
export function updateRolePermissions(id: number, permissionIds: number[], isActive: boolean) { return request(`/roles/${id}/permissions`, { method: "PUT", body: JSON.stringify({ permissionIds, isActive }) }) as Promise<{ data: RoleDetails }> }
export function deleteRole(id: number) { return request(`/roles/${id}`, { method: "DELETE" }) as Promise<null> }
