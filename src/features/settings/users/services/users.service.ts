import { request } from '../../../../services/api'

export type UserRole = string
export type User = { id: number; email: string; name: string; role: UserRole; department: string | null; phone: string | null; isActive: boolean | number; createdAt: string; updatedAt: string }
export type UserInput = { email: string; name: string; role: UserRole; department: string; phone: string; isActive: boolean; password?: string }
type UserListResponse = { data: User[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
type UserListParams = { search?: string; status?: string; page?: number; limit?: number }

export function listUsers({ search = '', status = 'all', page = 1, limit = 10 }: UserListParams = {}) {
  const query = new URLSearchParams({ search, status, page: String(page), limit: String(limit) })
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
