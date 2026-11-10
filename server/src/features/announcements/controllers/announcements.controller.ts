import { rm } from 'node:fs/promises'
import path from 'node:path'
import type { Request, RequestHandler } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { db } from '../../../config/database.js'
import { httpError } from '../../../middleware/errors.js'
import { announcementDirectory } from '../middleware/announcement-upload.middleware.js'

type Category = 'general' | 'policy' | 'annual' | 'monthly'
type UploadedFile = Express.Multer.File

const CATEGORIES = new Set<Category>(['general', 'policy', 'annual', 'monthly'])

function companyIdOf(req: Request): number {
  const id = Number(req.user?.company?.id)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(403, 'ไม่พบบริษัทของผู้ใช้')
  return id
}

function canManage(req: Request): boolean {
  const role = String(req.user?.role?.name ?? '').trim().toLowerCase()
  const department = String(req.user?.department ?? '').trim().toLowerCase()
  return role === 'admin'
    || (department === 'hr div.' && req.user?.permissions.some((permission) => permission.name === 'จัดการประกาศ') === true)
}

function needManager(req: Request) {
  if (!canManage(req)) throw httpError(403, 'ไม่มีสิทธิ์จัดการประกาศ')
}

function parseId(raw: unknown): number {
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'รหัสประกาศไม่ถูกต้อง')
  return id
}

function safeOriginalName(value: string): string {
  const name = path.basename(value.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return Array.from(name || 'announcement-file').slice(0, 255).join('')
}

function resolveStoredPath(fileName: string): string {
  const resolved = path.resolve(announcementDirectory, path.basename(fileName))
  if (path.dirname(resolved) !== announcementDirectory) throw httpError(400, 'พาธไฟล์ไม่ถูกต้อง')
  return resolved
}

async function discard(files: UploadedFile[]) {
  await Promise.all(files.map(async (file) => {
    try {
      await rm(file.path, { force: true })
    } catch (error) {
      console.error('Unable to remove uncommitted announcement file', error)
    }
  }))
}

function fileDetails(rows: RowDataPacket[]) {
  return rows.map((row) => ({
    id: Number(row.id),
    fileName: String(row.fileName),
    mimeType: String(row.mimeType),
    fileSize: Number(row.fileSize),
  }))
}

export const index: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const companyId = companyIdOf(req)
  const manager = canManage(req)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.id, a.title, a.summary, a.content, a.category, a.status,
            a.expires_at AS expiresAt, a.published_at AS publishedAt, a.created_at AS createdAt,
            u.name AS author,
            EXISTS (SELECT 1 FROM announcement_reads ar
                     WHERE ar.announcement_id = a.id AND ar.user_id = ?) AS isRead,
            (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) AS readCount
       FROM announcements a
       JOIN users u ON u.id = a.author_id
      WHERE a.company_id = ? AND a.status <> 'archived'
        AND (? = 1 OR a.status = 'published')
      ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.id DESC
      LIMIT 200`,
    [req.user.id, companyId, manager ? 1 : 0],
  )
  const [unreadRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
       FROM announcements a
      WHERE a.company_id = ? AND a.status = 'published'
        AND NOT EXISTS (
          SELECT 1 FROM announcement_reads ar
           WHERE ar.announcement_id = a.id AND ar.user_id = ?
        )`,
    [companyId, req.user.id],
  )
  const unreadCount = Number(unreadRows[0]?.count ?? 0)

  if (rows.length === 0) {
    res.json({ data: [], unreadCount })
    return
  }

  const ids = rows.map((row) => Number(row.id))
  const [attachments] = await db.query<RowDataPacket[]>(
    `SELECT id, announcement_id AS announcementId, original_name AS fileName,
            mime_type AS mimeType, file_size AS fileSize
       FROM announcement_attachments
      WHERE announcement_id IN (${ids.map(() => '?').join(',')})
      ORDER BY id`,
    ids,
  )
  const filesByAnnouncement = new Map<number, ReturnType<typeof fileDetails>>()
  for (const attachment of attachments) {
    const announcementId = Number(attachment.announcementId)
    const files = filesByAnnouncement.get(announcementId) ?? []
    files.push(...fileDetails([attachment]))
    filesByAnnouncement.set(announcementId, files)
  }

  const data = rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    summary: row.summary === null ? null : String(row.summary),
    content: String(row.content),
    category: row.category as Category,
    status: String(row.status) as 'draft' | 'published',
    expiresAt: row.expiresAt,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    author: String(row.author),
    isRead: Boolean(row.isRead),
    readCount: Number(row.readCount),
    files: filesByAnnouncement.get(Number(row.id)) ?? [],
  }))
  res.json({ data, unreadCount })
}

export const unreadCount: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
       FROM announcements a
      WHERE a.company_id = ? AND a.status = 'published'
        AND NOT EXISTS (
          SELECT 1 FROM announcement_reads ar
           WHERE ar.announcement_id = a.id AND ar.user_id = ?
        )`,
    [companyIdOf(req), req.user.id],
  )
  res.json({ data: Number(rows[0]?.count ?? 0) })
}

export const notifications: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const companyId = companyIdOf(req)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.id, a.title, a.summary, a.category, a.published_at AS publishedAt,
            EXISTS (SELECT 1 FROM announcement_reads ar
                     WHERE ar.announcement_id = a.id AND ar.user_id = ?) AS isRead
       FROM announcements a
      WHERE a.company_id = ? AND a.status = 'published'
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT 50`,
    [req.user.id, companyId],
  )
  const [unreadRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
       FROM announcements a
      WHERE a.company_id = ? AND a.status = 'published'
        AND NOT EXISTS (SELECT 1 FROM announcement_reads ar
                         WHERE ar.announcement_id = a.id AND ar.user_id = ?)`,
    [companyId, req.user.id],
  )
  res.json({
    data: rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      summary: row.summary === null ? null : String(row.summary),
      category: row.category as Category,
      publishedAt: row.publishedAt,
      isRead: Boolean(row.isRead),
    })),
    unreadCount: Number(unreadRows[0]?.count ?? 0),
  })
}

export const readAllNotifications: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  await db.execute(
    `INSERT IGNORE INTO announcement_reads (announcement_id, user_id)
     SELECT id, ? FROM announcements
      WHERE company_id = ? AND status = 'published'`,
    [req.user.id, companyIdOf(req)],
  )
  res.status(204).end()
}

export const store: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  needManager(req)
  const files = (req.files as UploadedFile[] | undefined) ?? []
  let committed = false

  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : ''
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
    const category = typeof req.body?.category === 'string' ? req.body.category as Category : 'general'
    const publishImmediately = req.body?.publishImmediately === 'true'
    const expiresAt = typeof req.body?.expiresAt === 'string' && req.body.expiresAt.trim() ? req.body.expiresAt.trim() : null

    if (!title || title.length > 200) throw httpError(400, 'กรุณาระบุหัวข้อประกาศไม่เกิน 200 ตัวอักษร')
    if (summary.length > 500) throw httpError(400, 'คำโปรยต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    if (!content || content.length > 60000) throw httpError(400, 'กรุณาระบุเนื้อหาประกาศไม่เกิน 60,000 ตัวอักษร')
    if (!CATEGORIES.has(category)) throw httpError(400, 'หมวดหมู่ประกาศไม่ถูกต้อง')
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) throw httpError(400, 'วันที่สิ้นสุดไม่ถูกต้อง')
    if (expiresAt) {
      const parsed = new Date(`${expiresAt}T00:00:00.000Z`)
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== expiresAt) throw httpError(400, 'วันที่สิ้นสุดไม่ถูกต้อง')
    }

    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO announcements
          (company_id, author_id, title, summary, content, category, status, expires_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${publishImmediately ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
        [companyIdOf(req), req.user.id, title, summary || null, content, category, publishImmediately ? 'published' : 'draft', expiresAt],
      )
      const announcementId = Number(result.insertId)
      for (const file of files) {
        await connection.execute(
          `INSERT INTO announcement_attachments
            (announcement_id, stored_name, original_name, mime_type, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [announcementId, file.filename, safeOriginalName(file.originalname), file.mimetype, file.size],
        )
      }
      await connection.commit()
      committed = true
      res.status(201).json({ data: { id: announcementId, status: publishImmediately ? 'published' : 'draft' } })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } finally {
    if (!committed) await discard(files)
  }
}

export const publish: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  needManager(req)
  const id = parseId(req.params.id)
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE announcements SET status = 'published', published_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ? AND status = 'draft'`,
    [id, companyIdOf(req)],
  )
  if (result.affectedRows === 0) throw httpError(404, 'ไม่พบประกาศฉบับร่าง')
  res.json({ data: { id, status: 'published' } })
}

export const archive: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  needManager(req)
  const id = parseId(req.params.id)
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE announcements SET status = 'archived'
      WHERE id = ? AND company_id = ? AND status <> 'archived'`,
    [id, companyIdOf(req)],
  )
  if (result.affectedRows === 0) throw httpError(404, 'ไม่พบประกาศ')
  res.status(204).end()
}

export const markRead: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const id = parseId(req.params.id)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT id FROM announcements
      WHERE id = ? AND company_id = ? AND status = 'published'`,
    [id, companyIdOf(req)],
  )
  if (!rows[0]) throw httpError(404, 'ไม่พบประกาศ')
  await db.execute(
    'INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)',
    [id, req.user.id],
  )
  res.status(204).end()
}

export const file: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const id = parseId(req.params.id)
  const fileId = parseId(req.params.fileId)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT attachment.stored_name AS storedName, attachment.original_name AS originalName,
            attachment.mime_type AS mimeType, announcement.status
       FROM announcement_attachments attachment
       JOIN announcements announcement ON announcement.id = attachment.announcement_id
      WHERE announcement.id = ? AND attachment.id = ? AND announcement.company_id = ?
        AND announcement.status <> 'archived'`,
    [id, fileId, companyIdOf(req)],
  )
  const row = rows[0]
  if (!row || (row.status !== 'published' && !canManage(req))) throw httpError(404, 'ไม่พบไฟล์แนบ')

  const mimeType = String(row.mimeType)
  const preview = req.query.preview === '1'
  if (preview && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw httpError(415, 'ไฟล์นี้ไม่รองรับการแสดงตัวอย่าง กรุณาดาวน์โหลดไฟล์')
  }
  const safeName = safeOriginalName(String(row.originalName))
  const fallbackName = safeName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\;]/g, '_')
  const encodedName = encodeURIComponent(safeName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  res.setHeader('Content-Type', mimeType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Disposition', `${preview ? 'inline' : 'attachment'}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`)
  res.sendFile(resolveStoredPath(String(row.storedName)))
}
