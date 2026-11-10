import { MOCK_CM_PROJECTS } from '../constants'
import type { CmPriority, CmProject, CmStatus } from '../types'

const CM_PROJECTS_STORAGE_KEY = 'cm_projects_v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCmPriority(value: unknown): value is CmPriority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
}

function isCmStatus(value: unknown): value is CmStatus {
  return value === 'reported' || value === 'awaiting_inspection' || value === 'queued'
    || value === 'in_progress' || value === 'awaiting_acceptance' || value === 'done' || value === 'cancelled'
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function parseCmProject(value: unknown): CmProject | null {
  if (!isRecord(value)) return null
  const { id, code, name, customer, problem, priority, status, createdAt, updatedAt, estimatedCost } = value
  if (
    typeof id !== 'string'
    || typeof code !== 'string'
    || typeof name !== 'string'
    || typeof customer !== 'string'
    || typeof problem !== 'string'
    || !isCmPriority(priority)
    || !isCmStatus(status)
    || typeof createdAt !== 'string'
    || typeof updatedAt !== 'string'
    || (estimatedCost !== undefined && (typeof estimatedCost !== 'number' || !Number.isFinite(estimatedCost)))
    || !isOptionalString(value.objective)
    || !isOptionalString(value.problemType)
    || !isOptionalString(value.requestedDate)
    || !isOptionalString(value.plannedStart)
    || !isOptionalString(value.plannedEnd)
    || !isOptionalString(value.responsible)
    || !isOptionalString(value.location)
    || !isOptionalString(value.notes)
  ) return null

  return {
    id,
    code,
    name,
    customer,
    problem,
    objective: value.objective,
    priority,
    problemType: value.problemType,
    status,
    requestedDate: value.requestedDate,
    plannedStart: value.plannedStart,
    plannedEnd: value.plannedEnd,
    responsible: value.responsible,
    location: value.location,
    estimatedCost,
    notes: value.notes,
    createdAt,
    updatedAt,
  }
}

function parseCmProjects(value: unknown): CmProject[] | null {
  if (!Array.isArray(value)) return null
  const projects: CmProject[] = []
  for (const item of value) {
    const project = parseCmProject(item)
    if (!project) return null
    projects.push(project)
  }
  return projects
}

export function loadCmProjects(): CmProject[] {
  let storedProjects: string | null
  try {
    storedProjects = localStorage.getItem(CM_PROJECTS_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to read CM projects from browser storage', error)
    return MOCK_CM_PROJECTS
  }

  if (!storedProjects) return MOCK_CM_PROJECTS

  let parsedProjects: unknown
  try {
    parsedProjects = JSON.parse(storedProjects)
  } catch (error) {
    console.warn('Invalid CM project data in browser storage', error)
    return MOCK_CM_PROJECTS
  }

  const projects = parseCmProjects(parsedProjects)
  if (!projects) {
    console.warn('CM project data in browser storage failed validation')
    return MOCK_CM_PROJECTS
  }
  return projects
}

export function saveCmProjects(projects: CmProject[]) {
  const validatedProjects = parseCmProjects(projects)
  if (!validatedProjects) {
    console.error('Refusing to save invalid CM project data')
    return
  }

  try {
    localStorage.setItem(CM_PROJECTS_STORAGE_KEY, JSON.stringify(validatedProjects))
  } catch (error) {
    console.warn('Unable to save CM projects to browser storage', error)
  }
}
