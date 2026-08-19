import { request } from './api'

export function getUserProfile() {
  return request('/api/users/me')
}
