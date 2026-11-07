import { request } from '../../../../../services/api'

export const permissionModulesChangedEvent = 'permission-modules-changed'

export type PermissionModule = { id: number; name: string; iconName: string | null; isActive: boolean | number; sortOrder: number; permissionCount: number }
export type PermissionModuleIcon = Pick<PermissionModule, 'name' | 'iconName'>
export type PermissionModuleInput = Pick<PermissionModule, 'name' | 'iconName' | 'sortOrder'> & { isActive: boolean }

export function listPermissionModules() { return request("/permissions/modules") as Promise<{ data: PermissionModule[] }> }
export function listPermissionModuleIcons() { return request("/permissions/modules/icons") as Promise<{ data: PermissionModuleIcon[] }> }
export async function createPermissionModule(input: PermissionModuleInput) {
	const response = await request("/permissions/modules", { method: "POST", body: JSON.stringify(input) }) as { data: PermissionModule }
	window.dispatchEvent(new Event(permissionModulesChangedEvent))
	return response
}
export async function updatePermissionModule(id: number, input: Partial<PermissionModuleInput>) {
	const response = await request(`/permissions/modules/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as { data: PermissionModule }
	window.dispatchEvent(new Event(permissionModulesChangedEvent))
	return response
}
export async function deletePermissionModule(id: number) {
	const response = await request(`/permissions/modules/${id}`, { method: "DELETE" }) as null
	window.dispatchEvent(new Event(permissionModulesChangedEvent))
	return response
}
