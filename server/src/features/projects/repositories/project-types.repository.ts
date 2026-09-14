import { db } from '../../../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

interface ProjectTypeRow extends RowDataPacket {
  id: number
  name: string
  departmentId: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getActiveTypes(): Promise<ProjectTypeRow[]> {
  const [rows] = await db.query<ProjectTypeRow[]>(
    `SELECT
       id,
       name,
       department_id AS departmentId,
       is_active AS isActive,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM project_types
     WHERE is_deleted = 0
       AND is_active = 1
     ORDER BY id ASC`,
  )
  return rows
}
