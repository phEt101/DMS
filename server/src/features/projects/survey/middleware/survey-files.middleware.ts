import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'

export const storageDirectory = path.resolve(process.cwd(), 'storage')
export const surveyUploadDirectory = path.join(storageDirectory, 'surveys')
mkdirSync(surveyUploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    const destination = surveyUploadDirectory
    try { mkdirSync(destination, { recursive: true }) } catch {}
    callback(null, destination)
  },
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
})

export const surveyFilesUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => file.mimetype.startsWith('image/') ? callback(null, true) : callback(new Error('Only image files are allowed')),
})
