import { db } from '../../../config/database.js'

const selectFields = `
  d.id, d.title, d.description, d.document_number AS documentNumber,
  d.original_name AS originalName, d.mime_type AS mimeType,
  d.file_size AS fileSize, d.status, d.created_at AS createdAt,
  d.updated_at AS updatedAt, d.deleted_at AS deletedAt,
  u.display_name AS uploadedBy
`

export async function findAll({ deleted = false, search = '', limit = 50, offset = 0 } = {}) {
  const conditions = [deleted ? 'd.deleted_at IS NOT NULL' : 'd.deleted_at IS NULL']
  const values = []
  if (search) {
    conditions.push('(d.title LIKE ? OR d.document_number LIKE ?)')
    values.push(`%${search}%`, `%${search}%`)
  }
  values.push(limit, offset)
  const [rows] = await db.query(
    `SELECT ${selectFields} FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
    values,
  )
  return rows
}

export async function findById(id) {
  const [rows] = await db.query(
    `SELECT ${selectFields} FROM documents d
     LEFT JOIN users u ON u.id = d.uploaded_by WHERE d.id = ? LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

export async function create(input) {
  const [result] = await db.execute(
    `INSERT INTO documents
      (title, description, document_number, original_name, stored_name, file_path, mime_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.title, input.description ?? null, input.documentNumber ?? null,
      input.originalName ?? null, input.storedName ?? null, input.filePath ?? null,
      input.mimeType ?? null, input.fileSize ?? 0, input.uploadedBy ?? null],
  )
  return findById(result.insertId)
}

export async function update(id, input) {
  const allowed = {
    title: 'title', description: 'description', documentNumber: 'document_number',
    originalName: 'original_name', storedName: 'stored_name', filePath: 'file_path',
    mimeType: 'mime_type', fileSize: 'file_size', uploadedBy: 'uploaded_by',
  }
  const entries = Object.entries(input).filter(([key]) => allowed[key])
  if (!entries.length) return findById(id)
  await db.execute(
    `UPDATE documents SET ${entries.map(([key]) => `${allowed[key]} = ?`).join(', ')} WHERE id = ?`,
    [...entries.map(([, value]) => value ?? null), id],
  )
  return findById(id)
}

export async function trash(id) {
  const [result] = await db.execute(
    "UPDATE documents SET status = 'trash', deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
    [id],
  )
  return result.affectedRows > 0
}

export async function restore(id) {
  const [result] = await db.execute(
    "UPDATE documents SET status = 'active', deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
    [id],
  )
  return result.affectedRows > 0
}
