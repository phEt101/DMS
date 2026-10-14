import { request } from '../../../../../services/api'

export type Company = { id: number; name: string; logoUrl: string | null; isActive: boolean | number; userCount: number }
export type CompanyInput = { name: string; logoUrl: string; isActive: boolean }

export function listCompanies() { return request('/companies') as Promise<{ data: Company[] }> }
export function createCompany(input: CompanyInput) { return request('/companies', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ data: Company }> }
export function updateCompany(id: number, input: Partial<CompanyInput>) { return request(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(input) }) as Promise<{ data: Company }> }
export function deleteCompany(id: number) { return request(`/companies/${id}`, { method: 'DELETE' }) as Promise<null> }
