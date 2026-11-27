import { request } from '../../../../services/api'

// สิทธิ์รายบุคคล (User access) — หน้าจอ + สิทธิ์ที่เพิ่ม/ถอดเฉพาะคนนั้น

export type UserAccessModule = {
  id: number; name: string; isActive: boolean;
  base: boolean; granted: boolean; denied: boolean; effective: boolean;
}
export type UserAccessPermission = {
  id: number; name: string; module: string; isActive: boolean;
  base: boolean; granted: boolean; denied: boolean; effective: boolean;
}
export type UserAccess = {
  user: { id: number; name: string; email: string; role: string; department: string | null; company: string; isActive: boolean };
  modules: UserAccessModule[];
  permissions: UserAccessPermission[];
}
export type UserAccessInput = {
  moduleGrants: number[]; moduleDenies: number[];
  permissionGrants: number[]; permissionDenies: number[];
}

export function getUserAccess(id: number) {
  return request(`/users/${id}/access`) as Promise<{ data: UserAccess }>
}

export function updateUserAccess(id: number, input: UserAccessInput) {
  return request(`/users/${id}/access`, { method: 'PUT', body: JSON.stringify(input) }) as Promise<{ data: { saved: boolean } }>
}
