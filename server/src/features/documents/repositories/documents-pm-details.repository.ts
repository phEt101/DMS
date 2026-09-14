import { db } from '../../../config/database.js'
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface PmDetailRow extends RowDataPacket {
  id: number
  equipmentName: string
  equipmentModel: string | null
  faultSymptom: string | null
  remarks: string | null
  workOrderStatus: string
  operator1Id: number | null
  operator1Name: string | null
  operator2Id: number | null
  operator2Name: string | null
  operator3Id: number | null
  operator3Name: string | null
  createdAt: Date | string
  updatedAt: Date | string
  beforeImageIds: string | null
  afterImageIds: string | null
  referenceImageIds: string | null
}

interface CreatePmDetailInput {
  documentId: number | string
  equipmentName: string
  equipmentModel: string | null
  faultSymptom: string | null
  remarks: string | null
  operatorIds: number[]
  userId: number | null
}

const selectFields = `
  detail.id,
  detail.equipment_name AS equipmentName,
  detail.equipment_model AS equipmentModel,
  detail.fault_symptom AS faultSymptom,
  detail.remarks,
  detail.work_order_status AS workOrderStatus,
  detail.operator_1_id AS operator1Id,
  operator1.name AS operator1Name,
  detail.operator_2_id AS operator2Id,
  operator2.name AS operator2Name,
  detail.operator_3_id AS operator3Id,
  operator3.name AS operator3Name,
  detail.created_at AS createdAt,
  detail.updated_at AS updatedAt,
  (SELECT GROUP_CONCAT(upload.id ORDER BY upload.sort_order SEPARATOR ',')
   FROM documents_pm_detail_uploads upload
   WHERE upload.pm_detail_id = detail.id AND upload.image_phase = 'reference' AND upload.is_deleted = 0) AS referenceImageIds,
  (SELECT GROUP_CONCAT(upload.id ORDER BY upload.sort_order SEPARATOR ',')
   FROM documents_pm_detail_uploads upload
   WHERE upload.pm_detail_id = detail.id AND upload.image_phase = 'before' AND upload.is_deleted = 0) AS beforeImageIds,
  (SELECT GROUP_CONCAT(upload.id ORDER BY upload.sort_order SEPARATOR ',')
   FROM documents_pm_detail_uploads upload
   WHERE upload.pm_detail_id = detail.id AND upload.image_phase = 'after' AND upload.is_deleted = 0) AS afterImageIds
`

const joins = `
  FROM documents_pm_detail detail
  INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
  INNER JOIN documents document ON document.id = project.document_id
  LEFT JOIN users operator1 ON operator1.id = detail.operator_1_id
  LEFT JOIN users operator2 ON operator2.id = detail.operator_2_id
  LEFT JOIN users operator3 ON operator3.id = detail.operator_3_id
`

export async function findAllByDocumentId(documentId: number | string) {
  const [rows] = await db.query<PmDetailRow[]>(
    `SELECT ${selectFields} ${joins}
     WHERE project.document_id = ? AND document.deleted_at IS NULL
       AND project.is_deleted = 0 AND detail.is_deleted = 0
     ORDER BY detail.created_at DESC, detail.id DESC`,
    [documentId],
  )
  return rows
}

export async function findById(id: number) {
  const [rows] = await db.query<PmDetailRow[]>(
    `SELECT ${selectFields} ${joins}
     WHERE detail.id = ? AND document.deleted_at IS NULL
       AND project.is_deleted = 0 AND detail.is_deleted = 0
     LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function create(input: CreatePmDetailInput) {
  const [projects] = await db.query<(RowDataPacket & { id: number })[]>(
    `SELECT project.id
     FROM documents_pm_projects project
     INNER JOIN documents document ON document.id = project.document_id
     WHERE project.document_id = ? AND project.is_deleted = 0 AND document.deleted_at IS NULL
     LIMIT 1`,
    [input.documentId],
  )
  const projectId = projects[0]?.id
  if (!projectId) return null

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO documents_pm_detail
      (pm_project_id, work_order_no, equipment_name, equipment_model, fault_symptom,
       remarks, work_order_status, operator_1_id, operator_2_id, operator_3_id,
       created_by, updated_by, is_deleted)
     VALUES (?, NULL, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, 0)`,
    [
      projectId,
      input.equipmentName,
      input.equipmentModel,
      input.faultSymptom,
      input.remarks,
      input.operatorIds[0] ?? null,
      input.operatorIds[1] ?? null,
      input.operatorIds[2] ?? null,
      input.userId,
      input.userId,
    ],
  )
  await db.execute(
    'UPDATE documents_pm_projects SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [input.userId, projectId],
  )
  return findById(result.insertId)
}

export async function update(documentId: number | string, detailId: number | string, input: Pick<CreatePmDetailInput, 'equipmentName' | 'equipmentModel' | 'faultSymptom' | 'remarks' | 'userId'>) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE documents_pm_detail detail
     INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
     INNER JOIN documents document ON document.id = project.document_id
     SET detail.equipment_name = ?, detail.equipment_model = ?, detail.fault_symptom = ?, detail.remarks = ?, detail.updated_by = ?
     WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
       AND project.is_deleted = 0 AND detail.is_deleted = 0`,
    [input.equipmentName, input.equipmentModel, input.faultSymptom, input.remarks, input.userId, documentId, detailId],
  )
  return result.affectedRows ? findById(Number(detailId)) : null
}

export interface PmDetailItemRow extends RowDataPacket {
  id: number
  section: 'cause' | 'action' | 'result'
  itemNo: number
  itemContent: string | null
}

const automaticWorkOrderStatuses = new Set(['scheduled', 'in_progress', 'completed'])

async function recalculateWorkOrderStatus(connection: PoolConnection, detailId: number | string, forceAutomatic = false) {
  const [details] = await connection.query<(RowDataPacket & { workOrderStatus: string })[]>(
    `SELECT work_order_status AS workOrderStatus
     FROM documents_pm_detail
     WHERE id = ? AND is_deleted = 0
     LIMIT 1 FOR UPDATE`,
    [detailId],
  )
  const currentStatus = details[0]?.workOrderStatus
  if (!currentStatus || (!forceAutomatic && !automaticWorkOrderStatuses.has(currentStatus))) return currentStatus ?? null

  const [progress] = await connection.query<(RowDataPacket & { hasCompletedData: number; hasProgressData: number })[]>(
    `SELECT
       (
         EXISTS(
           SELECT 1 FROM documents_pm_detail_items item
           WHERE item.pm_detail_id = ? AND item.section = 'result' AND item.is_deleted = 0
             AND TRIM(COALESCE(item.item_content, '')) <> ''
         )
         OR EXISTS(
           SELECT 1 FROM documents_pm_detail_uploads upload
           WHERE upload.pm_detail_id = ? AND upload.image_phase = 'after' AND upload.is_deleted = 0
         )
       ) AS hasCompletedData,
       (
         EXISTS(
           SELECT 1 FROM documents_pm_detail_items item
           WHERE item.pm_detail_id = ? AND item.section IN ('cause', 'action') AND item.is_deleted = 0
             AND TRIM(COALESCE(item.item_content, '')) <> ''
         )
         OR EXISTS(
           SELECT 1 FROM documents_pm_detail_uploads upload
           WHERE upload.pm_detail_id = ? AND upload.image_phase = 'before' AND upload.is_deleted = 0
         )
       ) AS hasProgressData`,
    [detailId, detailId, detailId, detailId],
  )
  const nextStatus = progress[0]?.hasCompletedData ? 'completed' : progress[0]?.hasProgressData ? 'in_progress' : 'scheduled'

  if (nextStatus === 'completed') {
    await connection.execute(
      `UPDATE documents_pm_detail
       SET work_order_status = 'completed',
           work_started_at = COALESCE(work_started_at, CURRENT_TIMESTAMP),
           work_completed_at = COALESCE(work_completed_at, CURRENT_TIMESTAMP)
       WHERE id = ?`,
      [detailId],
    )
  } else if (nextStatus === 'in_progress') {
    await connection.execute(
      `UPDATE documents_pm_detail
       SET work_order_status = 'in_progress',
           work_started_at = COALESCE(work_started_at, CURRENT_TIMESTAMP),
           work_completed_at = NULL
       WHERE id = ?`,
      [detailId],
    )
  } else {
    await connection.execute(
      `UPDATE documents_pm_detail
       SET work_order_status = 'scheduled', work_started_at = NULL, work_completed_at = NULL
       WHERE id = ?`,
      [detailId],
    )
  }
  return nextStatus
}

export async function findItems(documentId: number | string, detailId: number | string) {
  const [rows] = await db.query<PmDetailItemRow[]>(
    `SELECT item.id, item.section, item.item_no AS itemNo, item.item_content AS itemContent
     FROM documents_pm_detail_items item
     INNER JOIN documents_pm_detail detail ON detail.id = item.pm_detail_id
     INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
     INNER JOIN documents document ON document.id = project.document_id
     WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
       AND project.is_deleted = 0 AND detail.is_deleted = 0 AND item.is_deleted = 0
     ORDER BY FIELD(item.section, 'cause', 'action', 'result'), item.item_no`,
    [documentId, detailId],
  )
  return rows
}

export async function saveItems(documentId: number | string, detailId: number | string, items: Array<{ section: string; itemNo: number; itemContent: string | null }>, operatorIds: number[], statusMode: 'automatic' | 'on_hold' | 'waiting_parts', userId: number | null) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [details] = await connection.query<(RowDataPacket & { id: number })[]>(
      `SELECT detail.id FROM documents_pm_detail detail
       INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       INNER JOIN documents document ON document.id = project.document_id
       WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
         AND project.is_deleted = 0 AND detail.is_deleted = 0
       LIMIT 1 FOR UPDATE`,
      [documentId, detailId],
    )
    if (!details[0]) { await connection.rollback(); return null }

    await connection.execute(
      'UPDATE documents_pm_detail_items SET item_content = NULL, updated_by = ? WHERE pm_detail_id = ? AND is_deleted = 0',
      [userId, detailId],
    )
    for (const item of items) {
      await connection.execute(
        `INSERT INTO documents_pm_detail_items
          (pm_detail_id, section, item_no, item_content, created_by, updated_by, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE item_content = VALUES(item_content), updated_by = VALUES(updated_by)`,
        [detailId, item.section, item.itemNo, item.itemContent, userId, userId],
      )
    }
    await connection.execute(
      `UPDATE documents_pm_detail
       SET operator_1_id = ?, operator_2_id = ?, operator_3_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [operatorIds[0] ?? null, operatorIds[1] ?? null, operatorIds[2] ?? null, userId, detailId],
    )
    if (statusMode === 'automatic') {
      await recalculateWorkOrderStatus(connection, detailId, true)
    } else {
      await connection.execute(
        'UPDATE documents_pm_detail SET work_order_status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [statusMode, userId, detailId],
      )
    }
    await connection.commit()
    return findItems(documentId, detailId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function attachImages(documentId: number | string, detailId: number | string, referenceFiles: Express.Multer.File[], beforeFiles: Express.Multer.File[], afterFiles: Express.Multer.File[], userId: number | null) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [details] = await connection.query<(RowDataPacket & { id: number })[]>(
      `SELECT detail.id
       FROM documents_pm_detail detail
       INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       INNER JOIN documents document ON document.id = project.document_id
       WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
         AND project.is_deleted = 0 AND detail.is_deleted = 0
       LIMIT 1 FOR UPDATE`, [documentId, detailId],
    )
    if (!details[0]) { await connection.rollback(); return null }

    const saveFiles = async (files: Express.Multer.File[], phase: 'reference' | 'before' | 'after') => {
      const [existing] = await connection.query<(RowDataPacket & { sortOrder: number })[]>(
        `SELECT sort_order AS sortOrder FROM documents_pm_detail_uploads
         WHERE pm_detail_id = ? AND image_phase = ? AND is_deleted = 0
         ORDER BY sort_order FOR UPDATE`, [detailId, phase],
      )
      const occupied = new Set(existing.map((row) => row.sortOrder))
      const available = [1, 2, 3, 4].filter((position) => !occupied.has(position))
      if (files.length > available.length) throw new Error(`A maximum of 4 ${phase} images is allowed`)

      const ids: number[] = []
      for (const [index, file] of files.entries()) {
        const sortOrder = available[index]
        if (!sortOrder) throw new Error(`No ${phase} image slot is available`)
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO documents_pm_detail_uploads
            (pm_detail_id, image_phase, sort_order, stored_name, original_name, mime_type, file_size,
             storage_driver, storage_path, uploaded_by, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'local_disk', ?, ?, 0)`,
          [detailId, phase, sortOrder, file.filename, file.originalname, file.mimetype, file.size, `equipment-images/${file.filename}`, userId],
        )
        ids.push(result.insertId)
      }
      return ids
    }

    const referenceIds = await saveFiles(referenceFiles, 'reference')
    const beforeIds = await saveFiles(beforeFiles, 'before')
    const afterIds = await saveFiles(afterFiles, 'after')
    await connection.execute(
      'UPDATE documents_pm_detail SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId, detailId],
    )
    await recalculateWorkOrderStatus(connection, detailId)
    await connection.commit()
    return { referenceIds, beforeIds, afterIds }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function findImage(documentId: number | string, detailId: number | string, uploadId: number | string) {
  const [rows] = await db.query<(RowDataPacket & { storagePath: string; mimeType: string; originalName: string })[]>(
    `SELECT upload.storage_path AS storagePath, upload.mime_type AS mimeType, upload.original_name AS originalName
     FROM documents_pm_detail_uploads upload
     INNER JOIN documents_pm_detail detail ON detail.id = upload.pm_detail_id
     INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
     INNER JOIN documents document ON document.id = project.document_id
     WHERE upload.id = ? AND project.document_id = ? AND upload.pm_detail_id = ?
       AND upload.is_deleted = 0 AND detail.is_deleted = 0 AND project.is_deleted = 0
       AND document.deleted_at IS NULL LIMIT 1`, [uploadId, documentId, detailId],
  )
  return rows[0] ?? null
}

export async function softDeleteImage(documentId: number | string, detailId: number | string, uploadId: number | string, userId: number | null) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [details] = await connection.query<(RowDataPacket & { id: number })[]>(
      `SELECT detail.id
       FROM documents_pm_detail detail
       INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
       INNER JOIN documents document ON document.id = project.document_id
       WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
         AND project.is_deleted = 0 AND detail.is_deleted = 0
       LIMIT 1 FOR UPDATE`,
      [documentId, detailId],
    )
    if (!details[0]) { await connection.rollback(); return null }

    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE documents_pm_detail_uploads
       SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
       WHERE id = ? AND pm_detail_id = ? AND is_deleted = 0`,
      [userId, uploadId, detailId],
    )
    if (!result.affectedRows) { await connection.rollback(); return false }

    await connection.execute(
      'UPDATE documents_pm_detail SET updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId, detailId],
    )
    await recalculateWorkOrderStatus(connection, detailId)
    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
