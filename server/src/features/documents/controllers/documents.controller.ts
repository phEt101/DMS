import fs from 'node:fs'
import path from 'node:path'
import type { Request, Response } from 'express'
import { db } from '../../../config/database.js'
import { httpError } from '../../../middleware/errors.js'
import { documentUploadDirectory } from '../middleware/document-upload.middleware.js'

function requireDocumentPermission(req: Request, permissionName: string) {
  if (!req.user?.permissions.some((permission) => permission.name === permissionName)) throw httpError(403, 'ไม่มีสิทธิ์ดำเนินการกับเอกสาร')
}

function requireDocumentModule(req: Request) {
  const isAdmin = req.user?.role.name.trim().toLowerCase() === 'admin'
  if (!isAdmin && !req.user?.departmentModules.includes('documents')) throw httpError(403, 'ไม่มีสิทธิ์เข้าถึงเอกสาร')
}

function publicRow(row: any) {
  return {
    id: row.id,
    documentNo: row.document_no,
    title: row.title,
    description: row.description,
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    status: row.status,
    submitterName: row.submitter_name ?? null,
    reviewerName: row.reviewer_name ?? null,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  }
}

export async function index(req: Request, res: Response) {
  requireDocumentModule(req)
  const status = String(req.query.status ?? 'all')
  const allowed = ['all', 'pending', 'approved', 'rejected']
  if (!allowed.includes(status)) throw httpError(400, 'Invalid document status')
  const [rows] = await db.query<any[]>(
    `SELECT d.id, d.document_no, d.title, d.description, d.original_name, d.mime_type,
            d.file_size, d.status, d.review_note, d.submitted_at, d.reviewed_at,
            submitter.name AS submitter_name, reviewer.name AS reviewer_name
       FROM documents d
       LEFT JOIN users submitter ON submitter.id = d.submitted_by
       LEFT JOIN users reviewer ON reviewer.id = d.reviewed_by
       ${status === 'all' ? '' : 'WHERE d.status = ?'}
       ORDER BY d.submitted_at DESC, d.id DESC LIMIT 1000`,
    status === 'all' ? [] : [status],
  )
  res.json(rows.map(publicRow))
}

export async function store(req: Request, res: Response) {
  requireDocumentModule(req)
  requireDocumentPermission(req, 'ยื่นเอกสาร')
  const title = String(req.body?.title ?? '').trim()
  const description = String(req.body?.description ?? '').trim() || null
  const file = req.file
  if (!title || title.length > 255) {
    if (file) fs.rmSync(file.path, { force: true })
    throw httpError(400, 'กรุณาระบุชื่อเอกสารไม่เกิน 255 ตัวอักษร')
  }
  if (!file) throw httpError(400, 'กรุณาแนบไฟล์เอกสาร')
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).slice(0, 4)
  const [sequenceRows] = await db.query<any[]>(
    `SELECT COUNT(*) + 1 AS next_no FROM documents WHERE document_no LIKE ?`, [`DOC-${year}-%`],
  )
  const documentNo = `DOC-${year}-${String(sequenceRows[0].next_no).padStart(5, '0')}`
  try {
    const [result] = await db.execute<any>(
      `INSERT INTO documents (document_no, title, description, original_name, storage_path, mime_type, file_size, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentNo, title, description, path.basename(file.originalname), file.path, file.mimetype, file.size, req.user!.id],
    )
    res.status(201).json({ id: result.insertId, documentNo, title, description, status: 'pending', originalName: path.basename(file.originalname) })
  } catch (error) {
    fs.rmSync(file.path, { force: true })
    throw error
  }
}

export async function review(req: Request, res: Response) {
  requireDocumentModule(req)
  requireDocumentPermission(req, 'พิจารณาเอกสาร')
  const id = Number(req.params.id)
  const status = req.body?.status
  const reviewNote = String(req.body?.reviewNote ?? '').trim() || null
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'Invalid document id')
  if (!['approved', 'rejected'].includes(status)) throw httpError(400, 'สถานะอนุมัติไม่ถูกต้อง')
  if (status === 'rejected' && !reviewNote) throw httpError(400, 'กรุณาระบุเหตุผลที่ไม่อนุมัติ')
  const [result] = await db.execute<any>(
    `UPDATE documents SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`, [status, reviewNote, req.user!.id, id],
  )
  if (!result.affectedRows) throw httpError(409, 'เอกสารไม่อยู่ในสถานะรออนุมัติแล้ว')
  res.json({ id, status, reviewNote })
}

export async function file(req: Request, res: Response) {
  requireDocumentModule(req)
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'Invalid document id')
  const [rows] = await db.execute<any[]>(`SELECT storage_path, original_name, mime_type FROM documents WHERE id = ? LIMIT 1`, [id])
  const row = rows[0]
  if (!row) throw httpError(404, 'Document not found')
  const resolved = path.resolve(row.storage_path)
  if (!resolved.startsWith(`${documentUploadDirectory}${path.sep}`) || !fs.existsSync(resolved)) throw httpError(404, 'Document file not found')
  res.download(resolved, path.basename(row.original_name), (error) => {
    if (error && !res.headersSent) res.status(500).end()
  })
}

export async function destroy(req: Request, res: Response) {
  requireDocumentModule(req)
  requireDocumentPermission(req, 'ลบเอกสาร')
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'Invalid document id')
  const [rows] = await db.execute<any[]>(`SELECT storage_path FROM documents WHERE id = ? LIMIT 1`, [id])
  const row = rows[0]
  if (!row) throw httpError(404, 'Document not found')
  await db.execute(`DELETE FROM documents WHERE id = ?`, [id])
  const resolved = path.resolve(row.storage_path)
  if (resolved.startsWith(`${documentUploadDirectory}${path.sep}`)) fs.rmSync(resolved, { force: true })
  res.status(204).end()
}
