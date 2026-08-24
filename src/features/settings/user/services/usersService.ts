import { request } from '../../../../services/api'

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer'
export type User = { id: number; email: string; name: string; role: UserRole; department: string | null; phone: string | null; lastLoginAt: string | null; isActive: boolean | number; createdAt: string; updatedAt: string }
export type UserInput = { email: string; name: string; role: UserRole; department: string; phone: string; isActive: boolean; password?: string }
export type RoleSummary = Record<UserRole, number>
type UserListResponse = { data: User[]; pagination: { page: number; limit: number; total: number; totalPages: number } }

export function listUsers({ search = '', status = 'all', page = 1 } = {}) {
  const query = new URLSearchParams({ search, status, page: String(page), limit: '10' })
  return request(`/users?${query}`) as Promise<UserListResponse>
}

export function createUser(input: UserInput) {
  return request('/users', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ data: User }>
}

export function updateUser(id: number, input: Partial<UserInput>) {
  return request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }) as Promise<{ data: User }>
}

export function deleteUser(id: number) {
  return request(`/users/${id}`, { method: 'DELETE' }) as Promise<null>
}

export function getUserProfile() {
  return request('/users/me') as Promise<{ data: User }>
}

export function getRoleSummary() {
  return request('/users/role-summary') as Promise<{ data: RoleSummary }>
}
