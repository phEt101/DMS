import { request } from '../../../services/api'

export function listDeletedProjects() {
  return request('/projects/trash')
}

export function restoreProject(projectId: string) {
  return request(`/projects/${projectId}/restore`, { method: 'POST' })
}
