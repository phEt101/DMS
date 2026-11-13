import { request } from '../../../../../services/api'

export type Department = { id: number; companyId: number; company: string; name: string; isActive: boolean | number; userCount: number; moduleIds: number[] }
export type DepartmentInput = Pick<Department, 'companyId' | 'name' | 'moduleIds'> & { isActive: boolean }
export type CompanyDepartmentModulesUpdate = { companyId: number; departmentIds: number[]; moduleIds: number[]; enabled: boolean }

export function listDepartments() { return request("/departments") as Promise<{ data: Department[] }> }
export function createDepartment(input: DepartmentInput) { return request("/departments", { method: "POST", body: JSON.stringify(input) }) as Promise<{ data: Department }> }
export function updateDepartment(id: number, input: Partial<DepartmentInput>) { return request(`/departments/${id}`, { method: "PATCH", body: JSON.stringify(input) }) as Promise<{ data: Department }> }
export function updateCompanyDepartmentModules(input: CompanyDepartmentModulesUpdate) {
  return request("/departments/bulk-modules", { method: "PATCH", body: JSON.stringify(input) }) as Promise<{
    data: CompanyDepartmentModulesUpdate & {
      companyName: string
      departmentCount: number
      departmentNames: string[]
      moduleCount: number
      moduleNames: string[]
    }
  }>
}
export function deleteDepartment(id: number) { return request(`/departments/${id}`, { method: "DELETE" }) as Promise<null> }
