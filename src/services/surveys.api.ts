import { request } from './api'

export async function listSurveys() {
  return request('/surveys')
}

export async function getSurvey(id: number | string) {
  return request(`/surveys/${id}`)
}

export async function createSurvey(payload: any) {
  // payload may include files handled by multipart; caller may build FormData
  // Let central request() handle URL prefixing and headers (it preserves FormData body as-is).
  return request('/surveys', { method: 'POST', body: payload })
}

export async function updateSurvey(id: number | string, payload: any) {
  return request(`/surveys/${id}`, { method: 'PUT', body: payload })
}

export async function deleteSurveyApi(id: number | string) {
  return request(`/surveys/${id}`, { method: 'DELETE' })
}

export async function listEquipmentTypes() {
  return request('/surveys/equipment-types/list')
}
