import { closeSync, openSync, readSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import type { Request, RequestHandler } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { db } from '../../../config/database.js'
import { httpError } from '../../../middleware/errors.js'
import { logActivity } from '../../settings/activity/repositories/activity.repository.js'
import { payslipDirectory } from '../middleware/payslip-upload.middleware.js'

type UploadedFile = Express.Multer.File

const normalize = (value: string) => value.normalize('NFC').trim().toLowerCase().replace(/[_\s]+/g, ' ')

function companyIdOf(req: Request): number {
  const id = Number(req.user?.company?.id)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(403, 'ไม่พบบริษัทของผู้ใช้')
  return id
}

// จัดการสลิปได้เฉพาะ admin และสมาชิกแผนก HR Div.
function canManage(req: Request): boolean {
  const role = String(req.user?.role?.name ?? '').trim().toLowerCase()
  const department = String(req.user?.department ?? '').trim().toLowerCase()
  return role === 'admin' || department === 'hr div.'
}

function needManager(req: Request) {
  if (!canManage(req)) throw httpError(403, 'ไม่มีสิทธิ์จัดการสลิปเงินเดือน')
}

function parsePeriod(rawYear: unknown, rawMonth: unknown): { year: number; month: number } {
  const year = Number(rawYear)
  const month = Number(rawMonth)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw httpError(400, 'ปีไม่ถูกต้อง')
  if (!Number.isInteger(month) || month < 1 || month > 12) throw httpError(400, 'เดือนไม่ถูกต้อง')
  return { year, month }
}

function parseId(raw: unknown): number {
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'รหัสไม่ถูกต้อง')
  return id
}

function resolveStoredPath(fileName: string): string {
  const resolved = path.resolve(payslipDirectory, path.basename(fileName))
  if (path.dirname(resolved) !== payslipDirectory) throw httpError(400, 'พาธไฟล์ไม่ถูกต้อง')
  return resolved
}

async function removeStored(fileName: string | null | undefined) {
  if (!fileName) return
  await rm(resolveStoredPath(fileName), { force: true }).catch(() => undefined)
}

// ตรวจเนื้อไฟล์จริง (ไม่เชื่อแค่นามสกุล/mimetype ที่ client ส่งมา)
function isPdfFile(filePath: string): boolean {
  const fd = openSync(filePath, 'r')
  try {
    const header = Buffer.alloc(5)
    readSync(fd, header, 0, 5, 0)
    return header.toString('latin1') === '%PDF-'
  } finally {
    closeSync(fd)
  }
}

async function discard(files: UploadedFile[]) {
  await Promise.all(files.map((file) => removeStored(file.filename)))
}

function noteOf(raw: unknown): string | null {
  const note = typeof raw === 'string' ? raw.trim() : ''
  if (note.length > 255) throw httpError(400, 'หมายเหตุยาวเกินไป')
  return note || null
}

interface SaveInput {
  companyId: number
  userId: number
  year: number
  month: number
  note: string | null
  file: UploadedFile
  uploadedBy: number
}

async function savePayslip(input: SaveInput): Promise<{ id: number; replaced: boolean }> {
  const [existing] = await db.execute<RowDataPacket[]>(
    'SELECT id, file_path AS filePath FROM payslips WHERE user_id = ? AND period_year = ? AND period_month = ?',
    [input.userId, input.year, input.month],
  )
  await db.execute(
    `INSERT INTO payslips (company_id, user_id, period_year, period_month, note, file_path, original_name, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE note = VALUES(note), file_path = VALUES(file_path), original_name = VALUES(original_name),
       file_size = VALUES(file_size), uploaded_by = VALUES(uploaded_by), viewed_at = NULL`,
    [input.companyId, input.userId, input.year, input.month, input.note, input.file.filename,
      input.file.originalname.slice(0, 255), input.file.size, input.uploadedBy],
  )
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT id FROM payslips WHERE user_id = ? AND period_year = ? AND period_month = ?',
    [input.userId, input.year, input.month],
  )
  if (existing[0]) await removeStored(existing[0].filePath as string)
  return { id: Number(rows[0]?.id), replaced: Boolean(existing[0]) }
}

export const mine: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT id, period_year AS year, period_month AS month, note, original_name AS fileName, file_size AS fileSize,
            viewed_at AS viewedAt, updated_at AS updatedAt
       FROM payslips WHERE user_id = ? ORDER BY period_year DESC, period_month DESC`,
    [req.user.id],
  )
  res.json({ data: rows })
}

export const file: RequestHandler = async (req, res) => {
  if (!req.user) throw httpError(401, 'Authentication required')
  const id = parseId(req.params.id)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT user_id AS userId, company_id AS companyId, file_path AS filePath, period_year AS year, period_month AS month, viewed_at AS viewedAt
       FROM payslips WHERE id = ? LIMIT 1`,
    [id],
  )
  const row = rows[0]
  const isOwner = row?.userId === req.user.id
  if (!row || !(isOwner || (canManage(req) && row.companyId === companyIdOf(req)))) {
    throw httpError(404, 'ไม่พบสลิปเงินเดือน')
  }

  if (isOwner && !row.viewedAt) {
    await db.execute('UPDATE payslips SET viewed_at = CURRENT_TIMESTAMP WHERE id = ? AND viewed_at IS NULL', [id])
  }

  const downloadName = `payslip-${row.year}-${String(row.month).padStart(2, '0')}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${downloadName}"`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  res.sendFile(resolveStoredPath(row.filePath as string), (error) => {
    if (error && !res.headersSent) res.status(404).json({ message: 'ไม่พบไฟล์สลิปเงินเดือน' })
  })
}

export const manageList: RequestHandler = async (req, res) => {
  needManager(req)
  const { year, month } = parsePeriod(req.query.year, req.query.month)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT u.id AS userId, u.name, u.email, d.name AS department,
            p.id AS payslipId, p.original_name AS fileName, p.file_size AS fileSize, p.note,
            p.viewed_at AS viewedAt, p.updated_at AS updatedAt
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id AND d.deleted_at IS NULL
       LEFT JOIN payslips p ON p.user_id = u.id AND p.period_year = ? AND p.period_month = ?
      WHERE u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL
      ORDER BY u.name ASC`,
    [year, month, companyIdOf(req)],
  )
  res.json({ data: rows })
}

export const upload: RequestHandler = async (req, res) => {
  const uploaded = req.file ? [req.file] : []
  try {
    needManager(req)
    const upload = req.file
    if (!upload) throw httpError(400, 'กรุณาเลือกไฟล์ PDF')
    const { year, month } = parsePeriod(req.query.year ?? req.body?.year, req.query.month ?? req.body?.month)
    const userId = parseId(req.params.userId)
    const companyId = companyIdOf(req)
    if (!isPdfFile(upload.path)) throw httpError(400, 'ไฟล์ไม่ใช่ PDF ที่ถูกต้อง')

    const [users] = await db.execute<RowDataPacket[]>(
      'SELECT id, name FROM users WHERE id = ? AND company_id = ? AND is_active = 1 AND deleted_at IS NULL',
      [userId, companyId],
    )
    if (!users[0]) throw httpError(404, 'ไม่พบพนักงาน')

    const saved = await savePayslip({ companyId, userId, year, month, note: noteOf(req.body?.note), file: upload, uploadedBy: req.user!.id })
    await logActivity({
      userId: req.user!.id,
      module: 'documents',
      action: saved.replaced ? 'updated' : 'created',
      entityType: 'payslip',
      entityId: saved.id,
      details: { employee: users[0].name, period: `${year}-${String(month).padStart(2, '0')}` },
      ipAddress: req.ip,
    })
    res.status(saved.replaced ? 200 : 201).json({ data: { id: saved.id, replaced: saved.replaced } })
  } catch (error) {
    await discard(uploaded)
    throw error
  }
}

// จับคู่ไฟล์กับพนักงานจากชื่อไฟล์: ตรงกับอีเมล, ส่วนหน้า @ ของอีเมล หรือชื่อ-นามสกุล
export const bulkUpload: RequestHandler = async (req, res) => {
  const files = Array.isArray(req.files) ? (req.files as UploadedFile[]) : []
  try {
    needManager(req)
    if (files.length === 0) throw httpError(400, 'กรุณาเลือกไฟล์ PDF')
    const { year, month } = parsePeriod(req.body?.year, req.body?.month)
    const companyId = companyIdOf(req)

    const [users] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, email FROM users WHERE company_id = ? AND is_active = 1 AND deleted_at IS NULL',
      [companyId],
    )
    const byKey = new Map<string, Array<{ id: number; name: string }>>()
    const addKey = (key: string, user: { id: number; name: string }) => {
      const list = byKey.get(key) ?? []
      if (!list.some((item) => item.id === user.id)) list.push(user)
      byKey.set(key, list)
    }
    for (const user of users) {
      const entry = { id: user.id as number, name: user.name as string }
      const email = normalize(String(user.email))
      addKey(email, entry)
      addKey(email.split('@')[0] ?? email, entry)
      addKey(normalize(String(user.name)), entry)
    }

    const saved: Array<{ file: string; employee: string }> = []
    const failed: Array<{ file: string; reason: string }> = []
    const usedUserIds = new Set<number>()
    const periodLabel = `${year}-${String(month).padStart(2, '0')}`

    for (const upload of files) {
      const display = upload.originalname
      const matches = byKey.get(normalize(path.basename(display, path.extname(display)))) ?? []
      const match = matches[0]
      if (matches.length !== 1 || !match) {
        failed.push({ file: display, reason: matches.length === 0 ? 'ไม่พบพนักงานที่ตรงกับชื่อไฟล์' : 'ชื่อไฟล์ตรงกับพนักงานหลายคน' })
        await removeStored(upload.filename)
      } else if (usedUserIds.has(match.id)) {
        failed.push({ file: display, reason: 'มีไฟล์อื่นของพนักงานคนนี้ในชุดเดียวกันแล้ว' })
        await removeStored(upload.filename)
      } else if (!isPdfFile(upload.path)) {
        failed.push({ file: display, reason: 'ไฟล์ไม่ใช่ PDF ที่ถูกต้อง' })
        await removeStored(upload.filename)
      } else {
        usedUserIds.add(match.id)
        const result = await savePayslip({ companyId, userId: match.id, year, month, note: null, file: upload, uploadedBy: req.user!.id })
        await logActivity({
          userId: req.user!.id,
          module: 'documents',
          action: result.replaced ? 'updated' : 'created',
          entityType: 'payslip',
          entityId: result.id,
          details: { employee: match.name, period: periodLabel },
          ipAddress: req.ip,
        })
        saved.push({ file: display, employee: match.name })
      }
    }
    res.json({ data: { saved, failed } })
  } catch (error) {
    await discard(files)
    throw error
  }
}

export const remove: RequestHandler = async (req, res) => {
  needManager(req)
  const id = parseId(req.params.id)
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT p.file_path AS filePath, p.period_year AS year, p.period_month AS month, u.name AS employee
       FROM payslips p JOIN users u ON u.id = p.user_id WHERE p.id = ? AND p.company_id = ?`,
    [id, companyIdOf(req)],
  )
  const row = rows[0]
  if (!row) throw httpError(404, 'ไม่พบสลิปเงินเดือน')

  const [result] = await db.execute<ResultSetHeader>('DELETE FROM payslips WHERE id = ?', [id])
  if (result.affectedRows > 0) await removeStored(row.filePath as string)
  await logActivity({
    userId: req.user!.id,
    module: 'documents',
    action: 'deleted',
    entityType: 'payslip',
    entityId: id,
    details: { employee: row.employee, period: `${row.year}-${String(row.month).padStart(2, '0')}` },
    ipAddress: req.ip,
  })
  res.status(204).end()
}
