import { request } from '../../../../services/api'

export async function apiGet(path: string): Promise<any> {
  return request(path)
}
