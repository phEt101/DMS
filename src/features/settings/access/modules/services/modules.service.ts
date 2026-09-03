import { request } from '../../../../../services/api'

export type PermissionModule = { id: number; name: string; isActive: boolean | number; sortOrder: number; permissionCount: number }
export type PermissionModuleInput = Pick<PermissionModule, 'name' | 'sortOrder'> & { isActive: boolean }

export function listPermissionModules() { return request("/permissions/modules") as Promise<{ data: PermissionModule[] }> }
export function createPermissionModule(input: PermissionModuleInput) { return request("/permissions/modules", { method: "POST", body: JSON.stringify(input) }) as Promise<{ data: PermissionModule }> }
export function updatePermissionModule(id: number, input: Partial<PermissionModuleInput>) { return request(`/permissions/modules/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ data: PermissionModule }> }
export function deletePermissionModule(id: number) { return request(`/permissions/modules/${id}`, { method: "DELETE" }) as Promise<null> }
