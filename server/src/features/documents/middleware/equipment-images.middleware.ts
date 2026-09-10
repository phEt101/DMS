import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import { httpError } from '../../../middleware/errors.js'

export const equipmentUploadDirectory = path.resolve(process.cwd(), 'storage', 'equipment-images')
mkdirSync(equipmentUploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: equipmentUploadDirectory,
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
})

export const equipmentImagesUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => file.mimetype.startsWith('image/') ? callback(null, true) : callback(httpError(400, 'Only image files are allowed')),
}).fields([{ name: 'beforeImages', maxCount: 4 }, { name: 'afterImages', maxCount: 4 }])
