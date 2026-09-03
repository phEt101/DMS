import { request } from '../../../../../services/api'

export type Department = { id: number; name: string; isActive: boolean | number; userCount: number }
export type DepartmentInput = Pick<Department, 'name'> & { isActive: boolean }

export function listDepartments() { return request("/departments") as Promise<{ data: Department[] }> }
export function createDepartment(input: DepartmentInput) { return request("/departments", { method: "POST", body: JSON.stringify(input) }) as Promise<{ data: Department }> }
export function updateDepartment(id: number, input: Partial<DepartmentInput>) { return request(`/departments/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ data: Department }> }
export function deleteDepartment(id: number) { return request(`/departments/${id}`, { method: "DELETE" }) as Promise<null> }
