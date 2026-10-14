import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'

export const documentUploadDirectory = path.resolve(process.cwd(), 'storage', 'documents')
mkdirSync(documentUploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, documentUploadDirectory),
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
})

const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'])
export const documentUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (allowedExtensions.has(path.extname(file.originalname).toLowerCase())) callback(null, true)
    else callback(new Error('Unsupported document file type'))
  },
})
