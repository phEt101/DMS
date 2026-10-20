import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import { httpError } from '../../../middleware/errors.js'

export const medicalCertificateDirectory = path.resolve(process.cwd(), 'storage', 'medical-certificates')
mkdirSync(medicalCertificateDirectory, { recursive: true })

const allowedTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, medicalCertificateDirectory),
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
})

export const medicalCertificateUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (allowedTypes[extension] !== file.mimetype) {
      callback(httpError(400, 'ไฟล์ใบรับรองแพทย์ต้องเป็น PDF, JPG หรือ PNG'))
      return
    }
    callback(null, true)
  },
})
