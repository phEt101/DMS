import { request } from '../../../../services/api'

export type Role = {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean | number;
  isActive: boolean | number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  userCount: number;
  permissionCount: number;
};

export type RolePermission = Pick<
  Permission,
  'id' | 'name' | 'description' | 'module' | 'isActive'
> & {
  isAssigned: boolean | number
}

export type RoleDetails = Role & {
  permissions: RolePermission[]
}

export type RoleInput = {
  name: string
  description: string
  isActive: boolean
  permissionIds: number[]
}

export type Department = {
  id: number
  name: string
  description: string | null
  isActive: boolean | number
  userCount: number
}

export type DepartmentInput = Pick<Department, 'name' | 'description'> & { isActive: boolean }

export type Permission = {
  id: number
  name: string
  description: string | null
  module: string
  isActive: boolean | number
  roleCount: number
}

export type PermissionInput = Pick<Permission, 'name' | 'description' | 'module'> & { isActive: boolean }

export function listRoles() {
  return request("/roles") as Promise<{ data: RoleDetails[] }>;
}

export function getRole(id: number) {
  return request(`/roles/${id}`) as Promise<{
    data: RoleDetails
  }>
}

export function createRole(input: RoleInput) {
  return request('/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  }) as Promise<{ data: RoleDetails }>
}

export function updateRolePermissions(id: number, permissionIds: number[]) {
  return request(`/roles/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  }) as Promise<{ data: RoleDetails }>
}

export function listDepartments() {
  return request('/departments') as Promise<{ data: Department[] }>
}

export function createDepartment(input: DepartmentInput) {
  return request('/departments', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ data: Department }>
}

export function updateDepartment(id: number, input: Partial<DepartmentInput>) {
  return request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(input) }) as Promise<{ data: Department }>
}

export function deleteDepartment(id: number) {
  return request(`/departments/${id}`, { method: 'DELETE' }) as Promise<null>
}

export function listPermissions() {
  return request('/permissions') as Promise<{ data: Permission[] }>
}

export function createPermission(input: PermissionInput) {
  return request('/permissions', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ data: Permission }>
}

export function updatePermission(id: number, input: Partial<PermissionInput>) {
  return request(`/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }) as Promise<{ data: Permission }>
}

export function deletePermission(id: number) {
  return request(`/permissions/${id}`, { method: 'DELETE' }) as Promise<null>
}
