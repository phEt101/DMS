import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../../../config/database.js'
import { httpError } from '../../../middleware/errors.js'

export const equipmentStorageDirectory = path.resolve(process.cwd(), 'storage')
export const equipmentUploadDirectory = path.join(equipmentStorageDirectory, 'projects')
mkdirSync(equipmentUploadDirectory, { recursive: true })

const imagePhaseByField: Record<string, 'reference' | 'before' | 'after'> = {
  referenceImages: 'reference',
  beforeImages: 'before',
  afterImages: 'after',
}

async function findProjectTypeSlug(encryptedId: string, equipmentId: string) {
  const [rows] = await db.query<(RowDataPacket & { slug: string })[]>(
    `SELECT project_type.slug
     FROM projects project
     INNER JOIN project_types project_type ON project_type.id = project.project_type_id
     INNER JOIN pm_projects pm_project ON pm_project.project_id = project.id AND pm_project.is_deleted = 0
     INNER JOIN pm_equipment equipment ON equipment.pm_project_id = pm_project.id AND equipment.is_deleted = 0
     WHERE project.encrypted_id = ? AND equipment.id = ? AND project.deleted_at IS NULL
       AND project_type.is_active = 1 AND project_type.is_deleted = 0
     LIMIT 1`,
    [encryptedId, equipmentId],
  )
  const slug = rows[0]?.slug
  if (!slug) throw httpError(404, 'Project equipment not found')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw httpError(500, 'Project type slug is invalid')
  return slug
}

const projectTypeSlugByRequest = new WeakMap<object, Promise<string>>()

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const encryptedId = req.params.encryptedId
    const equipmentId = req.params.equipmentId
    const imagePhase = imagePhaseByField[file.fieldname]
    if (typeof encryptedId !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(encryptedId) || typeof equipmentId !== 'string' || !/^\d+$/.test(equipmentId) || !imagePhase) {
      callback(httpError(400, 'Invalid project equipment image path'), '')
      return
    }
    let projectTypeSlug = projectTypeSlugByRequest.get(req)
    if (!projectTypeSlug) {
      projectTypeSlug = findProjectTypeSlug(encryptedId, equipmentId)
      projectTypeSlugByRequest.set(req, projectTypeSlug)
    }
    void projectTypeSlug
      .then((projectTypeSlug) => {
        const destination = path.join(equipmentUploadDirectory, encryptedId, projectTypeSlug, 'equipment', equipmentId, imagePhase)
        mkdirSync(destination, { recursive: true })
        callback(null, destination)
      })
      .catch((error: unknown) => callback(error instanceof Error ? error : new Error('Unable to resolve project image path'), ''))
  },
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
})

export const equipmentImagesUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, callback) => file.mimetype.startsWith('image/') ? callback(null, true) : callback(httpError(400, 'Only image files are allowed')),
}).fields([{ name: 'referenceImages', maxCount: 4 }, { name: 'beforeImages', maxCount: 4 }, { name: 'afterImages', maxCount: 4 }])
