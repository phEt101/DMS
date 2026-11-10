import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { ErrorRequestHandler } from 'express'
import { httpError } from '../../../middleware/errors.js'

export const announcementDirectory = path.resolve(process.cwd(), 'storage', 'announcements')
mkdirSync(announcementDirectory, { recursive: true })

export const MAX_ANNOUNCEMENT_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ANNOUNCEMENT_FILES = 8

const allowedTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, announcementDirectory),
  filename: (_req, _file, callback) => callback(null, randomUUID()),
})

export const announcementUpload = multer({
  storage,
  defParamCharset: 'utf8',
  limits: { fileSize: MAX_ANNOUNCEMENT_FILE_BYTES, files: MAX_ANNOUNCEMENT_FILES },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (allowedTypes[extension] !== file.mimetype) {
      callback(httpError(400, 'รองรับไฟล์ PDF, รูปภาพ JPG/PNG/WEBP, Word และ Excel เท่านั้น'))
      return
    }
    callback(null, true)
  },
})

export const announcementUploadErrorHandler: ErrorRequestHandler = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์แต่ละไฟล์ต้องมีขนาดไม่เกิน 10 MB'
      : error.code === 'LIMIT_FILE_COUNT' ? `แนบไฟล์ได้ไม่เกิน ${MAX_ANNOUNCEMENT_FILES} ไฟล์`
      : 'อัปโหลดไฟล์ไม่สำเร็จ'
    return next(httpError(400, message))
  }
  next(error)
}
