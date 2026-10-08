import { Router } from 'express'
import { handleListSurveys, handleGetSurvey, handleCreateSurvey, handleUpdateSurvey, handleDeleteSurvey } from '../controllers/surveys.controller.js'
import { surveyFilesUpload } from '../middleware/survey-files.middleware.js'

export const surveysRouter = Router()

// list
surveysRouter.get('/', handleListSurveys)
// get single
surveysRouter.get('/:id', handleGetSurvey)

// create: accept multipart; field 'payload' contains JSON; files optional
surveysRouter.post('/', surveyFilesUpload.any(), handleCreateSurvey)
// update
surveysRouter.put('/:id', surveyFilesUpload.any(), handleUpdateSurvey)
// delete
surveysRouter.delete('/:id', handleDeleteSurvey)

// serve uploaded survey file by id (secure)
import fs from 'node:fs'
import path from 'node:path'

surveysRouter.get('/files/:id', async (req, res) => {
  try {
    const fid = Number(req.params.id)
    if (!fid) return res.status(400).json({ error: 'invalid id' })
    const { db } = await import('../../../config/database.js')
    const [rows] = await db.query(`SELECT storage_path, mime_type FROM survey_files WHERE id = ? LIMIT 1`, [fid])
    const file = (rows as any[])[0]
    if (!file) return res.status(404).json({ error: 'not found' })
    const storagePath = String(file.storage_path || '')
    const surveyDir = path.resolve(process.cwd(), 'storage', 'surveys')
    const resolved = path.resolve(storagePath)
    // ensure file is inside storage/surveys
    if (!resolved.startsWith(surveyDir)) return res.status(403).json({ error: 'forbidden' })
    if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'not found' })
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')
    res.sendFile(resolved)
  } catch (err) {
    console.error('serve file failed', err)
    res.status(500).json({ error: 'failed' })
  }
})

// equipment types helper
surveysRouter.get('/equipment-types/list', async (req, res) => {
  try {
    const { db } = await import('../../../config/database.js')
    const [rows] = await db.query(`SELECT id, code, name, sort_order FROM equipment_types WHERE is_active = 1 ORDER BY sort_order ASC`)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'failed' })
  }
})
