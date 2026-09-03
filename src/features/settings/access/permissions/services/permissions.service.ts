import { request } from '../../../../../services/api'

export type Permission = { id: number; name: string; moduleId: number; module: string; isActive: boolean | number; roleCount: number }
export type PermissionInput = Pick<Permission, 'name' | 'moduleId'> & { isActive: boolean }

export function listPermissions() { return request("/permissions") as Promise<{ data: Permission[] }> }
export function createPermission(input: PermissionInput) { return request("/permissions", { method: "POST", body: JSON.stringify(input) }) as Promise<{ data: Permission }> }
export function updatePermission(id: number, input: Partial<PermissionInput>) { return request(`/permissions/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ data: Permission }> }
export function deletePermission(id: number) { return request(`/permissions/${id}`, { method: "DELETE" }) as Promise<null> }
