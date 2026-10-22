import { MOCK_CM_PROJECTS } from '../constants'
import type { CmProject } from '../types'

const CM_PROJECTS_STORAGE_KEY = 'cm_projects_v1'

export function loadCmProjects(): CmProject[] {
  try {
    const storedProjects = localStorage.getItem(CM_PROJECTS_STORAGE_KEY)
    return storedProjects ? JSON.parse(storedProjects) as CmProject[] : MOCK_CM_PROJECTS
  } catch {
    return MOCK_CM_PROJECTS
  }
}

export function saveCmProjects(projects: CmProject[]) {
  try {
    localStorage.setItem(CM_PROJECTS_STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
}
