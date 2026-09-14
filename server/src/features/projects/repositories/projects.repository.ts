import { db } from '../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { createProjectPublicId, createTemporaryProjectPublicId } from '../services/project-public-id.service.js'

interface ProjectRow extends RowDataPacket {
  id: number
  encryptedId: string
  projectTypeId: number | null
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

interface ProjectInput {
  projectTypeId?: number | string | null
  projectManagerName?: string | null
  customerName?: string | null
  uploadedBy?: number | null
}

interface FindOptions {
  deleted?: boolean
  search?: string
  status?: ProjectRow['status']
  projectTypeId?: number
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
  if (options.projectTypeId) {
    conditions.push('d.project_type_id = ?')
    values.push(options.projectTypeId)
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
  d.encrypted_id AS encryptedId,
  d.project_type_id AS projectTypeId,
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
  COALESCE(files.sizeBytes, 0) AS sizeBytes,
  pmu.name AS lastModifiedBy,
  ops.operatorNames AS operatorNames
`

export async function findAll(options: FindOptions = {}) {
  const { limit = 50, offset = 0, sortOrder = 'desc' } = options
  const { conditions, values } = buildConditions(options)

  values.push(limit, offset)

  const [rows] = await db.query<ProjectRow[]>(
    `SELECT ${selectFields}
     FROM projects d
     LEFT JOIN users u ON u.id = d.created_by
     LEFT JOIN pm_projects pm ON pm.project_id = d.id AND pm.is_deleted = 0
     LEFT JOIN users pmu ON pmu.id = pm.updated_by
     LEFT JOIN (
       SELECT
         pm_project_id,
         GROUP_CONCAT(DISTINCT operator_name ORDER BY operator_name SEPARATOR ' • ') AS operatorNames
       FROM (
         SELECT dpd.pm_project_id, u1.name AS operator_name
         FROM pm_equipment dpd
         LEFT JOIN users u1 ON u1.id = dpd.operator_1_id
         WHERE dpd.is_deleted = 0 AND u1.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u2.name AS operator_name
         FROM pm_equipment dpd
         LEFT JOIN users u2 ON u2.id = dpd.operator_2_id
         WHERE dpd.is_deleted = 0 AND u2.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u3.name AS operator_name
         FROM pm_equipment dpd
         LEFT JOIN users u3 ON u3.id = dpd.operator_3_id
         WHERE dpd.is_deleted = 0 AND u3.name IS NOT NULL
       ) operator_rows
       GROUP BY pm_project_id
     ) ops ON ops.pm_project_id = pm.id
     LEFT JOIN (
       SELECT project.project_id, SUM(upload.file_size) AS sizeBytes
       FROM pm_equipment_uploads upload
       INNER JOIN pm_equipment detail ON detail.id = upload.pm_equipment_id AND detail.is_deleted = 0
       INNER JOIN pm_projects project ON project.id = detail.pm_project_id AND project.is_deleted = 0
       WHERE upload.is_deleted = 0
       GROUP BY project.project_id
     ) files ON files.project_id = d.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY d.id, d.encrypted_id, d.project_type_id, pm.projects_name, pm.project_description, pm.project_status, pm.site_address,
       pm.site_lat, pm.site_lon, pm.planned_start_date, pm.planned_end_date, d.project_manager_name, d.customer_name, d.status,
       d.created_at, pm.updated_at, d.deleted_at, u.name, pmu.name, ops.operatorNames, files.sizeBytes
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
     FROM projects d
     LEFT JOIN pm_projects pm ON pm.project_id = d.id AND pm.is_deleted = 0
     WHERE ${conditions.join(' AND ')}`,
    values,
  )

  return Number(rows[0]?.total ?? 0)
}

async function findOne(column: 'id' | 'encrypted_id', value: number | string) {
  const [rows] = await db.query<ProjectRow[]>(
    `SELECT ${selectFields}
     FROM projects d
     LEFT JOIN users u ON u.id = d.created_by
     LEFT JOIN pm_projects pm ON pm.project_id = d.id AND pm.is_deleted = 0
     LEFT JOIN users pmu ON pmu.id = pm.updated_by
     LEFT JOIN (
       SELECT
         pm_project_id,
         GROUP_CONCAT(DISTINCT operator_name ORDER BY operator_name SEPARATOR ' • ') AS operatorNames
       FROM (
         SELECT dpd.pm_project_id, u1.name AS operator_name
         FROM pm_equipment dpd
         LEFT JOIN users u1 ON u1.id = dpd.operator_1_id
         WHERE dpd.is_deleted = 0 AND u1.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u2.name AS operator_name
         FROM pm_equipment dpd
         LEFT JOIN users u2 ON u2.id = dpd.operator_2_id
         WHERE dpd.is_deleted = 0 AND u2.name IS NOT NULL
         UNION ALL
         SELECT dpd.pm_project_id, u3.name AS operator_name
         FROM pm_equipment dpd
         LEFT JOIN users u3 ON u3.id = dpd.operator_3_id
         WHERE dpd.is_deleted = 0 AND u3.name IS NOT NULL
       ) operator_rows
       GROUP BY pm_project_id
     ) ops ON ops.pm_project_id = pm.id
     LEFT JOIN (
       SELECT project.project_id, SUM(upload.file_size) AS sizeBytes
       FROM pm_equipment_uploads upload
       INNER JOIN pm_equipment detail ON detail.id = upload.pm_equipment_id AND detail.is_deleted = 0
       INNER JOIN pm_projects project ON project.id = detail.pm_project_id AND project.is_deleted = 0
       WHERE upload.is_deleted = 0
       GROUP BY project.project_id
     ) files ON files.project_id = d.id
     WHERE d.${column} = ?
     GROUP BY d.id, d.encrypted_id, d.project_type_id, pm.projects_name, pm.project_description, pm.project_status, pm.site_address,
       pm.site_lat, pm.site_lon, pm.planned_start_date, pm.planned_end_date, d.project_manager_name, d.customer_name, d.status,
       d.created_at, pm.updated_at, d.deleted_at, u.name, pmu.name, ops.operatorNames, files.sizeBytes
     LIMIT 1`,
    [value],
  )

  return rows[0] ?? null
}

export function findById(id: number | string) {
  return findOne('id', id)
}

export function findByEncryptedId(encryptedId: string) {
  return findOne('encrypted_id', encryptedId)
}

export async function create(input: ProjectInput) {
  const connection = await db.getConnection()
  let projectId: number
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO projects
        (encrypted_id, project_type_id, project_manager_name, customer_name, created_by, updated_by, status)
       VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      [
        createTemporaryProjectPublicId(),
        input.projectTypeId ?? null,
        input.projectManagerName ?? null,
        input.customerName ?? null,
        input.uploadedBy ?? null,
        input.uploadedBy ?? null,
      ],
    )
    projectId = result.insertId
    await connection.execute('UPDATE projects SET encrypted_id = ? WHERE id = ?', [createProjectPublicId(projectId), projectId])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  const project = await findById(projectId)
  if (!project) throw new Error('Created project could not be loaded')
  return project
}

export async function update(id: number | string, input: Partial<ProjectInput>) {
  const allowed: Partial<Record<keyof ProjectInput, string>> = {
    projectTypeId: 'project_type_id',
    projectManagerName: 'project_manager_name',
    customerName: 'customer_name',
    uploadedBy: 'updated_by',
  }
  const entries = Object.entries(input).filter(([key]) => key in allowed) as Array<[keyof ProjectInput, ProjectInput[keyof ProjectInput]]>
  if (!entries.length) return findById(id)
  await db.execute(
    `UPDATE projects SET ${entries.map(([key]) => `${allowed[key]} = ?`).join(', ')} WHERE id = ?`,
    [...entries.map(([, value]) => value ?? null), id],
  )
  return findById(id)
}

export async function trash(id: number | string, deletedBy: number | null) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE projects SET status = 'trash', deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedBy, id],
    )
    if (!result.affectedRows) { await connection.rollback(); return false }
    await connection.execute(
      `UPDATE pm_equipment_items item
       JOIN pm_equipment detail ON detail.id = item.pm_equipment_id
       JOIN pm_projects project ON project.id = detail.pm_project_id
       SET item.is_deleted = 1, item.deleted_at = CURRENT_TIMESTAMP, item.deleted_by = ?
       WHERE project.project_id = ? AND item.is_deleted = 0`, [deletedBy, id],
    )
    await connection.execute(
      `UPDATE pm_equipment detail
       JOIN pm_projects project ON project.id = detail.pm_project_id
       SET detail.is_deleted = 1, detail.deleted_at = CURRENT_TIMESTAMP, detail.deleted_by = ?
       WHERE project.project_id = ? AND detail.is_deleted = 0`, [deletedBy, id],
    )
    await connection.execute(
      `UPDATE pm_projects
       SET project_status = 'cancelled', is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
       WHERE project_id = ? AND is_deleted = 0`, [deletedBy, id],
    )
    await connection.execute(
      `UPDATE pm_equipment_uploads upload
       JOIN pm_equipment detail ON detail.id = upload.pm_equipment_id
       JOIN pm_projects project ON project.id = detail.pm_project_id
       SET upload.is_deleted = 1, upload.deleted_at = CURRENT_TIMESTAMP, upload.deleted_by = ?
       WHERE project.project_id = ? AND upload.is_deleted = 0`, [deletedBy, id],
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
      "UPDATE projects SET status = 'draft', deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL", [id],
    )
    if (!result.affectedRows) { await connection.rollback(); return false }
    await connection.execute(
      `UPDATE pm_projects
       SET project_status = 'planning', is_deleted = 0, deleted_at = NULL, deleted_by = NULL
       WHERE project_id = ? AND is_deleted = 1`, [id],
    )
    await connection.execute(
      `UPDATE pm_equipment detail JOIN pm_projects project ON project.id = detail.pm_project_id
       SET detail.is_deleted = 0, detail.deleted_at = NULL, detail.deleted_by = NULL WHERE project.project_id = ? AND detail.is_deleted = 1`, [id],
    )
    await connection.execute(
      `UPDATE pm_equipment_items item JOIN pm_equipment detail ON detail.id = item.pm_equipment_id
       JOIN pm_projects project ON project.id = detail.pm_project_id
       SET item.is_deleted = 0, item.deleted_at = NULL, item.deleted_by = NULL WHERE project.project_id = ? AND item.is_deleted = 1`, [id],
    )
    await connection.execute(
      `UPDATE pm_equipment_uploads upload
       JOIN pm_equipment detail ON detail.id = upload.pm_equipment_id
       JOIN pm_projects project ON project.id = detail.pm_project_id
       SET upload.is_deleted = 0, upload.deleted_at = NULL, upload.deleted_by = NULL
       WHERE project.project_id = ? AND upload.is_deleted = 1`, [id],
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
