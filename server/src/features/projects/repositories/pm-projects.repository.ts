import { db } from '../../../config/database.js'
import type { ResultSetHeader } from 'mysql2/promise'

interface PmProjectInput {
  projectId: number
  projectsName?: string | null
  projectDescription?: string | null
  siteAddress?: string | null
  siteLat?: number | string | null
  siteLon?: number | string | null
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  createdBy?: number | null
  updatedBy?: number | null
}

export async function create(input: PmProjectInput) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO pm_projects
      (project_id, projects_name, project_description, site_address, site_lat, site_lon,
       planned_start_date, planned_end_date, created_by, updated_by,
       project_status, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning', 0)`,
    [
      input.projectId,
      input.projectsName ?? null,
      input.projectDescription ?? null,
      input.siteAddress ?? null,
      input.siteLat ?? null,
      input.siteLon ?? null,
      input.plannedStartDate ?? null,
      input.plannedEndDate ?? null,
      input.createdBy ?? null,
      input.updatedBy ?? null,
    ],
  )

  return result.insertId
}

export async function updateByProjectId(input: PmProjectInput) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE pm_projects
     SET projects_name = ?, project_description = ?, site_address = ?, site_lat = ?, site_lon = ?,
         planned_start_date = ?, planned_end_date = ?, updated_by = ?
     WHERE project_id = ? AND is_deleted = 0`,
    [
      input.projectsName ?? null,
      input.projectDescription ?? null,
      input.siteAddress ?? null,
      input.siteLat ?? null,
      input.siteLon ?? null,
      input.plannedStartDate ?? null,
      input.plannedEndDate ?? null,
      input.updatedBy ?? null,
      input.projectId,
    ],
  )
  return result.affectedRows > 0
}

export async function updateStatusByProjectId(projectId: number | string, status: string, updatedBy: number | null) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE pm_projects
     SET project_status = ?, updated_by = ?
     WHERE project_id = ? AND is_deleted = 0`,
    [status, updatedBy, projectId],
  )
  return result.affectedRows > 0
}
