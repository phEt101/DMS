import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { ErrorRequestHandler } from 'express'
import { httpError } from '../../../middleware/errors.js'

export const payslipDirectory = path.resolve(process.cwd(), 'storage', 'payslips')
mkdirSync(payslipDirectory, { recursive: true })

export const MAX_PAYSLIP_BYTES = 5 * 1024 * 1024
export const MAX_BULK_FILES = 300

// ชื่อไฟล์บนดิสก์เป็น UUID เสมอ (ไม่ใช้ชื่อจากผู้ใช้) กัน path traversal และชื่อซ้ำ
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, payslipDirectory),
  filename: (_req, _file, callback) => callback(null, randomUUID()),
})

export const payslipUpload = multer({
  storage,
  defParamCharset: 'utf8',
  limits: { fileSize: MAX_PAYSLIP_BYTES, files: MAX_BULK_FILES },
})

// แปลง error ของ multer ให้เป็น 400 พร้อมข้อความที่อ่านเข้าใจ (ไม่ให้กลายเป็น 500)
export const payslipUploadErrorHandler: ErrorRequestHandler = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5 MB'
      : error.code === 'LIMIT_FILE_COUNT' ? `อัปโหลดได้ไม่เกิน ${MAX_BULK_FILES} ไฟล์ต่อครั้ง`
      : 'อัปโหลดไฟล์ไม่สำเร็จ'
    return next(httpError(400, message))
  }
  next(error)
}
