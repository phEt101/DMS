import { db } from '../../../config/database.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface PmDetailRow extends RowDataPacket {
  id: number
  equipmentName: string
  equipmentModel: string | null
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
}

interface CreatePmDetailInput {
  documentId: number | string
  equipmentName: string
  equipmentModel: string | null
  remarks: string | null
  operatorIds: number[]
  userId: number | null
}

const selectFields = `
  detail.id,
  detail.equipment_name AS equipmentName,
  detail.equipment_model AS equipmentModel,
  detail.remarks,
  detail.work_order_status AS workOrderStatus,
  detail.operator_1_id AS operator1Id,
  operator1.name AS operator1Name,
  detail.operator_2_id AS operator2Id,
  operator2.name AS operator2Name,
  detail.operator_3_id AS operator3Id,
  operator3.name AS operator3Name,
  detail.created_at AS createdAt,
  detail.updated_at AS updatedAt
  ,CONCAT_WS(',', detail.sw_1_before_upload_id, detail.sw_2_before_upload_id, detail.hw_1_before_upload_id, detail.hw_2_before_upload_id) AS beforeImageIds
  ,CONCAT_WS(',', detail.sw_1_after_upload_id, detail.sw_2_after_upload_id, detail.hw_1_after_upload_id, detail.hw_2_after_upload_id) AS afterImageIds
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
      (pm_project_id, work_order_no, equipment_name, equipment_model, equipment_location,
       remarks, work_order_status, operator_1_id, operator_2_id, operator_3_id,
       created_by, updated_by, is_deleted)
     VALUES (?, NULL, ?, ?, NULL, ?, 'scheduled', ?, ?, ?, ?, ?, 0)`,
    [
      projectId,
      input.equipmentName,
      input.equipmentModel,
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

export interface PmDetailItemRow extends RowDataPacket {
  id: number
  section: 'cause' | 'action' | 'result'
  itemNo: number
  itemContent: string | null
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

export async function saveItems(documentId: number | string, detailId: number | string, items: Array<{ section: string; itemNo: number; itemContent: string | null }>, operatorIds: number[], userId: number | null) {
  const [details] = await db.query<(RowDataPacket & { id: number })[]>(
    `SELECT detail.id FROM documents_pm_detail detail
     INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
     INNER JOIN documents document ON document.id = project.document_id
     WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
       AND project.is_deleted = 0 AND detail.is_deleted = 0 LIMIT 1`,
    [documentId, detailId],
  )
  if (!details[0]) return null

  await db.execute(
    'UPDATE documents_pm_detail_items SET item_content = NULL, updated_by = ? WHERE pm_detail_id = ? AND is_deleted = 0',
    [userId, detailId],
  )

  for (const item of items) {
    await db.execute(
      `INSERT INTO documents_pm_detail_items
        (pm_detail_id, section, item_no, item_content, created_by, updated_by, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE item_content = VALUES(item_content), updated_by = VALUES(updated_by)`,
      [detailId, item.section, item.itemNo, item.itemContent, userId, userId],
    )
  }
  await db.execute(
    `UPDATE documents_pm_detail
     SET operator_1_id = ?, operator_2_id = ?, operator_3_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [operatorIds[0] ?? null, operatorIds[1] ?? null, operatorIds[2] ?? null, userId, detailId],
  )
  return findItems(documentId, detailId)
}

export async function attachImages(documentId: number | string, detailId: number | string, beforeFiles: Express.Multer.File[], afterFiles: Express.Multer.File[], userId: number | null) {
  const [details] = await db.query<(RowDataPacket & Record<string, number | null>)[]>(
    `SELECT detail.id, detail.sw_1_before_upload_id, detail.sw_2_before_upload_id,
       detail.hw_1_before_upload_id, detail.hw_2_before_upload_id, detail.sw_1_after_upload_id,
       detail.sw_2_after_upload_id, detail.hw_1_after_upload_id, detail.hw_2_after_upload_id
     FROM documents_pm_detail detail
     INNER JOIN documents_pm_projects project ON project.id = detail.pm_project_id
     INNER JOIN documents document ON document.id = project.document_id
     WHERE project.document_id = ? AND detail.id = ? AND document.deleted_at IS NULL
       AND project.is_deleted = 0 AND detail.is_deleted = 0 LIMIT 1`, [documentId, detailId],
  )
  if (!details[0]) return null
  const saveFiles = async (files: Express.Multer.File[], category: string) => {
    const ids: number[] = []
    for (const file of files) {
      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO document_uploads
          (document_id, reference_type, reference_id, stored_name, original_name, mime_type, file_size,
           storage_driver, storage_path, upload_category, is_primary, uploaded_by, is_deleted)
         VALUES (?, 'documents_pm_detail', ?, ?, ?, ?, ?, 'local_disk', ?, ?, 0, ?, 0)`,
        [documentId, detailId, file.filename, file.originalname, file.mimetype, file.size, file.path, category, userId],
      )
      ids.push(result.insertId)
    }
    return ids
  }
  const beforeIds = await saveFiles(beforeFiles, 'pm_before')
  const afterIds = await saveFiles(afterFiles, 'pm_after')
  const assignments: string[] = []
  const values: Array<number> = []
  const beforeColumns = ['sw_1_before_upload_id', 'sw_2_before_upload_id', 'hw_1_before_upload_id', 'hw_2_before_upload_id'].filter((column) => details[0]?.[column] == null)
  const afterColumns = ['sw_1_after_upload_id', 'sw_2_after_upload_id', 'hw_1_after_upload_id', 'hw_2_after_upload_id'].filter((column) => details[0]?.[column] == null)
  beforeIds.forEach((id, index) => { if (beforeColumns[index]) { assignments.push(`${beforeColumns[index]} = ?`); values.push(id) } })
  afterIds.forEach((id, index) => { if (afterColumns[index]) { assignments.push(`${afterColumns[index]} = ?`); values.push(id) } })
  if (assignments.length) await db.execute(`UPDATE documents_pm_detail SET ${assignments.join(', ')}, updated_by = ? WHERE id = ?`, [...values, userId, detailId])
  return { beforeIds, afterIds }
}

export async function findImage(documentId: number | string, detailId: number | string, uploadId: number | string) {
  const [rows] = await db.query<(RowDataPacket & { storagePath: string; mimeType: string; originalName: string })[]>(
    `SELECT upload.storage_path AS storagePath, upload.mime_type AS mimeType, upload.original_name AS originalName
     FROM document_uploads upload
     WHERE upload.id = ? AND upload.document_id = ? AND upload.reference_type = 'documents_pm_detail'
       AND upload.reference_id = ? AND upload.is_deleted = 0 LIMIT 1`, [uploadId, documentId, detailId],
  )
  return rows[0] ?? null
}
