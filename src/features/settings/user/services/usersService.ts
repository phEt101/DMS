import { request } from '../../../../services/api'

export function getUserProfile() {
  return request('/users/me')
}
