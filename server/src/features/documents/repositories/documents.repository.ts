import { db } from '../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

interface DocumentRow extends RowDataPacket {
  id: number
  documentTypeId: number | null
  projectName: string | null
  projectDescription: string | null
  projectStatus: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | null
  siteAddress: string | null
  siteLat: number | null
  siteLon: number | null
  plannedStartDate: Date | string | null
  plannedEndDate: Date | string | null
  projectManagerName: string | null
  customerName: string | null
  status: 'draft' | 'approved' | 'archived' | 'trash'
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  uploadedBy: string | null
  sizeBytes: number
  lastModifiedBy: string | null
  operatorNames: string | null
}

interface DocumentInput {
  documentTypeId?: number | string | null
  projectManagerName?: string | null
  customerName?: string | null
  uploadedBy?: number | null
}

interface FindOptions {
  deleted?: boolean
  search?: string
  status?: DocumentRow['status']
  documentTypeId?: number
  dateFrom?: string
  dateTo?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

function buildConditions(options: FindOptions) {
  const conditions = [options.deleted ? 'd.deleted_at IS NOT NULL' : 'd.deleted_at IS NULL']
  const values: Array<string | number> = []

  if (options.search) {
    conditions.push('(d.project_manager_name LIKE ? OR d.customer_name LIKE ? OR pm.projects_name LIKE ? OR pm.site_address LIKE ?)')
    values.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`, `%${options.search}%`)
  }
  if (options.status) {
    conditions.push('d.status = ?')
    values.push(options.status)
  }
  if (options.documentTypeId) {
    conditions.push('d.document_type_id = ?')
    values.push(options.documentTypeId)
  }
  if (options.dateFrom) {
    conditions.push('DATE(COALESCE(pm.updated_at, d.updated_at, d.created_at)) >= ?')
    values.push(options.dateFrom)
  }
  if (options.dateTo) {
    conditions.push('DATE(COALESCE(pm.updated_at, d.updated_at, d.created_at)) <= ?')
    values.push(options.dateTo)
  }

  return { conditions, values }
}

const selectFields = `
  d.id,
  d.document_type_id AS documentTypeId,
  pm.projects_name AS projectName,
  pm.project_description AS projectDescription,
  pm.project_status AS projectStatus,
  pm.site_address AS siteAddress,
  pm.site_lat AS siteLat,
  pm.site_lon AS siteLon,
  pm.planned_start_date AS plannedStartDate,
  pm.planned_end_date AS plannedEndDate,
  d.project_manager_name AS projectManagerName,
  d.customer_name AS customerName,
  d.status,
  d.created_at AS createdAt,
  pm.updated_at AS updatedAt,
  d.deleted_at AS deletedAt,
  u.name AS uploadedBy,
  COALESCE(SUM(CASE WHEN du.is_deleted = 0 THEN du.file_size ELSE 0 END), 0) AS sizeBytes,
  pmu.name AS lastModifiedBy,
  ops.operatorNames AS operatorNames
`

export async function findAll(options: FindOptions = {}) {
  const { limit = 50, offset = 0, sortOrder = 'desc' } = options
  const { conditions, values } = buildConditions(options)

  values.push(limit, offset)

  const [rows] = await db.query<DocumentRow[]>(
    `SELECT ${selectFields}
     FROM documents d
     LEFT JOIN users u ON u.id = d.created_by
     LEFT JOIN documents_pm_projects pm ON pm.document_id = d.id AND pm.is_deleted = 0
     LEFT JOIN users pmu ON pmu.id = pm.updated_by
     LEFT JOIN (
       SELECT
         pm_project_id,
         GROUP_CONCAT(DISTINCT operator_name ORDER BY operator_name SEPARATOR ' • ') AS operatorNames
       FROM (
         SELECT dpd.pm_project_id, u1.name AS operator_name
         FROM documents_pm_detail dpd
         LEFT JOIN users u1 ON u1.id = dpd.operator_1_id
         WHERE dpd.is_deleted = 0 AND u1.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u2.name AS operator_name
         FROM documents_pm_detail dpd
         LEFT JOIN users u2 ON u2.id = dpd.operator_2_id
         WHERE dpd.is_deleted = 0 AND u2.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u3.name AS operator_name
         FROM documents_pm_detail dpd
         LEFT JOIN users u3 ON u3.id = dpd.operator_3_id
         WHERE dpd.is_deleted = 0 AND u3.name IS NOT NULL
       ) operator_rows
       GROUP BY pm_project_id
     ) ops ON ops.pm_project_id = pm.id
     LEFT JOIN document_uploads du ON du.document_id = d.id AND du.is_deleted = 0
     WHERE ${conditions.join(' AND ')}
     GROUP BY d.id, d.document_type_id, pm.projects_name, pm.project_description, pm.project_status, pm.site_address,
       pm.site_lat, pm.site_lon, pm.planned_start_date, pm.planned_end_date, d.project_manager_name, d.customer_name, d.status,
       d.created_at, pm.updated_at, d.deleted_at, u.name, pmu.name, ops.operatorNames
     ORDER BY COALESCE(pm.updated_at, d.updated_at, d.created_at) ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
     LIMIT ? OFFSET ?`,
    values,
  )

  return rows
}

export async function countAll(options: Omit<FindOptions, 'limit' | 'offset' | 'sortOrder'> = {}) {
  const { conditions, values } = buildConditions(options)

  const [rows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(DISTINCT d.id) AS total
     FROM documents d
     LEFT JOIN documents_pm_projects pm ON pm.document_id = d.id AND pm.is_deleted = 0
     WHERE ${conditions.join(' AND ')}`,
    values,
  )

  return Number(rows[0]?.total ?? 0)
}

export async function findById(id: number | string) {
  const [rows] = await db.query<DocumentRow[]>(
    `SELECT ${selectFields}
     FROM documents d
     LEFT JOIN users u ON u.id = d.created_by
     LEFT JOIN documents_pm_projects pm ON pm.document_id = d.id AND pm.is_deleted = 0
     LEFT JOIN users pmu ON pmu.id = pm.updated_by
     LEFT JOIN (
       SELECT
         pm_project_id,
         GROUP_CONCAT(DISTINCT operator_name ORDER BY operator_name SEPARATOR ' • ') AS operatorNames
       FROM (
         SELECT dpd.pm_project_id, u1.name AS operator_name
         FROM documents_pm_detail dpd
         LEFT JOIN users u1 ON u1.id = dpd.operator_1_id
         WHERE dpd.is_deleted = 0 AND u1.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u2.name AS operator_name
         FROM documents_pm_detail dpd
         LEFT JOIN users u2 ON u2.id = dpd.operator_2_id
         WHERE dpd.is_deleted = 0 AND u2.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u3.name AS operator_name
         FROM documents_pm_detail dpd
         LEFT JOIN users u3 ON u3.id = dpd.operator_3_id
         WHERE dpd.is_deleted = 0 AND u3.name IS NOT NULL
       ) operator_rows
       GROUP BY pm_project_id
     ) ops ON ops.pm_project_id = pm.id
     LEFT JOIN document_uploads du ON du.document_id = d.id AND du.is_deleted = 0
     WHERE d.id = ?
     GROUP BY d.id, d.document_type_id, pm.projects_name, pm.project_description, pm.project_status, pm.site_address,
       pm.site_lat, pm.site_lon, pm.planned_start_date, pm.planned_end_date, d.project_manager_name, d.customer_name, d.status,
       d.created_at, pm.updated_at, d.deleted_at, u.name, pmu.name, ops.operatorNames
     LIMIT 1`,
    [id],
  )

  return rows[0] ?? null
}

export async function create(input: DocumentInput) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO documents
      (document_type_id, project_manager_name, customer_name, created_by, updated_by, status)
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [
      input.documentTypeId ?? null,
      input.projectManagerName ?? null,
      input.customerName ?? null,
      input.uploadedBy ?? null,
      input.uploadedBy ?? null,
    ],
  )
  const document = await findById(result.insertId)
  if (!document) throw new Error('Created document could not be loaded')
  return document
}

export async function update(id: number | string, input: Partial<DocumentInput>) {
  const allowed: Partial<Record<keyof DocumentInput, string>> = {
    documentTypeId: 'document_type_id',
    projectManagerName: 'project_manager_name',
    customerName: 'customer_name',
    uploadedBy: 'updated_by',
  }
  const entries = Object.entries(input).filter(([key]) => key in allowed) as Array<[keyof DocumentInput, DocumentInput[keyof DocumentInput]]>
  if (!entries.length) return findById(id)
  await db.execute(
    `UPDATE documents SET ${entries.map(([key]) => `${allowed[key]} = ?`).join(', ')} WHERE id = ?`,
    [...entries.map(([, value]) => value ?? null), id],
  )
  return findById(id)
}

export async function trash(id: number | string, deletedBy: number | null) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE documents SET status = 'trash', deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedBy, id],
    )
    if (!result.affectedRows) { await connection.rollback(); return false }
    await connection.execute(
      `UPDATE documents_pm_detail_items item
       JOIN documents_pm_detail detail ON detail.id = item.pm_detail_id
       JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       SET item.is_deleted = 1, item.deleted_at = CURRENT_TIMESTAMP, item.deleted_by = ?
       WHERE project.document_id = ? AND item.is_deleted = 0`, [deletedBy, id],
    )
    await connection.execute(
      `UPDATE documents_pm_detail detail
       JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       SET detail.is_deleted = 1, detail.deleted_at = CURRENT_TIMESTAMP, detail.deleted_by = ?
       WHERE project.document_id = ? AND detail.is_deleted = 0`, [deletedBy, id],
    )
    await connection.execute(
      `UPDATE documents_pm_projects
       SET project_status = 'cancelled', is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
       WHERE document_id = ? AND is_deleted = 0`, [deletedBy, id],
    )
    await connection.execute(
      `UPDATE document_uploads SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
       WHERE document_id = ? AND is_deleted = 0`, [deletedBy, id],
    )
    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function restore(id: number | string) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE documents SET status = 'draft', deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL", [id],
    )
    if (!result.affectedRows) { await connection.rollback(); return false }
    await connection.execute(
      `UPDATE documents_pm_projects
       SET project_status = 'planning', is_deleted = 0, deleted_at = NULL, deleted_by = NULL
       WHERE document_id = ? AND is_deleted = 1`, [id],
    )
    await connection.execute(
      `UPDATE documents_pm_detail detail JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       SET detail.is_deleted = 0, detail.deleted_at = NULL, detail.deleted_by = NULL WHERE project.document_id = ? AND detail.is_deleted = 1`, [id],
    )
    await connection.execute(
      `UPDATE documents_pm_detail_items item JOIN documents_pm_detail detail ON detail.id = item.pm_detail_id
       JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       SET item.is_deleted = 0, item.deleted_at = NULL, item.deleted_by = NULL WHERE project.document_id = ? AND item.is_deleted = 1`, [id],
    )
    await connection.execute(`UPDATE document_uploads SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE document_id = ? AND is_deleted = 1`, [id])
    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
