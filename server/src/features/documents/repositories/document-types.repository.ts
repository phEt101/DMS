import { db } from '../../../config/database.js'
import type { RowDataPacket } from 'mysql2/promise'

interface DocumentTypeRow extends RowDataPacket {
  id: number
  name: string
  departmentId: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getActiveTypes(): Promise<DocumentTypeRow[]> {
  const [rows] = await db.query<DocumentTypeRow[]>(
    `SELECT
       id,
       name,
       department_id AS departmentId,
       is_active AS isActive,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM document_types
     WHERE is_deleted = 0
       AND is_active = 1
     ORDER BY id ASC`,
  )
  return rows
}
