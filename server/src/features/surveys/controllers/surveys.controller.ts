import { db } from '../../../config/database.js'
import type { Request, Response } from 'express'
import { listSurveys, getSurveyById, deleteSurveyById } from '../repositories/surveys.repository.js'

export async function handleListSurveys(req: Request, res: Response) {
  const rows = await listSurveys()
  res.json(rows)
}

export async function handleGetSurvey(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })
  const survey = await getSurveyById(id)
  if (!survey) return res.status(404).json({ error: 'Not found' })
  res.json(survey)
}

export async function handleDeleteSurvey(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })
  const ok = await deleteSurveyById(id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.status(204).send()
}

// For create/update we accept multipart/form-data where a 'payload' field contains JSON string of survey data
export async function handleCreateSurvey(req: Request, res: Response) {
  const payload = req.body.payload ? JSON.parse(req.body.payload) : req.body

  // server-side validation when marking as submitted
  if (payload && payload.status === 'submitted') {
    const missing: string[] = []
    if (!payload.surveyDate) missing.push('surveyDate')
    if (!payload.projectName) missing.push('projectName')
    const contacts = Array.isArray(payload.contacts) ? payload.contacts : []
    const primary = contacts[0] || {}
    if (!primary || !primary.name) missing.push('contacts[0].name')
    if (!primary || !primary.phone) missing.push('contacts[0].phone')
    if (!primary || !primary.position) missing.push('contacts[0].position')
    if (missing.length > 0) return res.status(400).json({ error: 'validation failed', missing })
  }

  let conn: any | undefined
  try {
    conn = await db.getConnection()
    await conn!.beginTransaction()
    const tx = conn!
      // ensure survey_no exists (DB requires it). Use provided value or generate a unique temporary one.
    const surveyNo = payload.surveyNo ?? payload.survey_no ?? `SV-${new Date().getFullYear()}-${Date.now()}`

    // insert surveys first
    const [result] = await tx.query(`INSERT INTO surveys (survey_no, survey_date, project_name, floors, visit_type, status, notes, surveyed_by, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      surveyNo,
      payload.surveyDate || null,
      payload.projectName || null,
      payload.floors ?? null,
      payload.visitType || null,
      payload.status || 'draft',
      payload.notes || null,
      payload.surveyedBy ?? null,
      payload.submittedAt ?? null,
    ])
    const insertId = (result as any).insertId

    // process uploaded files (req.files) and insert into survey_files
    const fileIdMap: Record<string, number[]> = {}
    const files = (req.files as any[]) || []
    if (files.length > 0) {
      for (const f of files) {
        const key = String(f.fieldname ?? '')
        const purpose = (() => {
          if (f.fieldname === 'signPhoto') return 'sign'
          if (f.fieldname === 'fcpOverview') return 'fcp_overview'
          if (f.fieldname === 'fcpNameplate') return 'fcp_nameplate'
          if (f.fieldname === 'fcpInside') return 'fcp_inside'
          if (f.fieldname && f.fieldname.startsWith('equip-')) return 'equipment'
          return 'attachment'
        })()
        const storagePath = f.path || f.filename || ''
        const [r] = await tx.query(`INSERT INTO survey_files (survey_id, purpose, storage_path, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)`, [insertId, purpose, storagePath, f.originalname || null, f.mimetype || null, f.size || 0])
        const fid = (r as any).insertId
        if (!fileIdMap[key]) fileIdMap[key] = []
        fileIdMap[key].push(fid)
      }
    }

    // contacts
    if (Array.isArray(payload.contacts)) {
      for (const c of payload.contacts) {
        await tx.query(`INSERT INTO survey_contacts (survey_id, seq, name, position, phone) VALUES (?, ?, ?, ?, ?)`, [insertId, c.seq ?? 1, c.name ?? null, c.position ?? null, c.phone ?? null])
      }
    }

    // location
    if (payload.location) {
      const loc = payload.location
      const countryCode = (typeof loc.country === 'string' && loc.country.length === 2) ? loc.country.toUpperCase() : 'TH'
      await tx.query(`INSERT INTO survey_locations (survey_id, latitude, longitude, address_line, subdistrict_name, district_name, province_name, postal_code, postal_code_id, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        insertId,
        loc.latitude ?? null,
        loc.longitude ?? null,
        loc.address ?? null,
        loc.subdistrict ?? null,
        loc.district ?? null,
        loc.province ?? null,
        loc.postalCode ?? null,
        loc.postalCodeId ?? null,
        countryCode,
      ])
    }

    // fcp (use fileIdMap to map overview/nameplate/inside files if present)
    if (payload.fcp) {
      const f = payload.fcp
      const overviewId = fileIdMap['fcpOverview'] ? fileIdMap['fcpOverview'][0] : (f.overviewFileId ?? null)
      const nameplateId = fileIdMap['fcpNameplate'] ? fileIdMap['fcpNameplate'][0] : (f.nameplateFileId ?? null)
      const insideId = fileIdMap['fcpInside'] ? fileIdMap['fcpInside'][0] : (f.insideFileId ?? null)
      await tx.query(`INSERT INTO survey_fcp (survey_id, brand, model, panel_type, cabinet_material, power_status, overview_file_id, nameplate_file_id, inside_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        insertId,
        f.brand ?? null,
        f.model ?? null,
        f.type ?? null,
        f.material ?? null,
        f.status ?? null,
        overviewId,
        nameplateId,
        insideId,
      ])
    }

    // equipment
    if (Array.isArray(payload.equipment)) {
      let order = 0
      for (let i = 0; i < payload.equipment.length; i++) {
        const e = payload.equipment[i]
        order += 1
        const equipField = `equip-${i}`
        const photoId = fileIdMap[equipField] ? fileIdMap[equipField][0] : (e.photoFileId ?? null)
        await tx.query(`INSERT INTO survey_equipment (survey_id, equipment_type_id, custom_name, is_present, model, quantity, photo_file_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
          insertId,
          e.equipmentTypeId ?? null,
          e.customName ?? null,
          e.isPresent ? 1 : 0,
          e.model ?? null,
          e.qty ?? null,
          photoId,
          order,
        ])
      }
    }

    await tx.commit()
    const created = await getSurveyById(insertId)
    res.status(201).json(created)
  } catch (err) {
    if (conn) await conn.rollback()
    console.error('create survey failed', err)
    res.status(500).json({ error: 'create failed' })
  } finally {
    if (conn) conn.release()
  }
}

export async function handleUpdateSurvey(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })
  const payload = req.body.payload ? JSON.parse(req.body.payload) : req.body

  // server-side validation when marking as submitted
  if (payload && payload.status === 'submitted') {
    const missing: string[] = []
    if (!payload.surveyDate) missing.push('surveyDate')
    if (!payload.projectName) missing.push('projectName')
    const contacts = Array.isArray(payload.contacts) ? payload.contacts : []
    const primary = contacts[0] || {}
    if (!primary || !primary.name) missing.push('contacts[0].name')
    if (!primary || !primary.phone) missing.push('contacts[0].phone')
    if (!primary || !primary.position) missing.push('contacts[0].position')
    if (missing.length > 0) return res.status(400).json({ error: 'validation failed', missing })
  }

  // debug: log payload to assist diagnosing update failures
  console.debug('handleUpdateSurvey payload:', JSON.stringify(payload).slice(0, 2000))

  let conn: any | undefined
  try {
    conn = await db.getConnection()
    await conn!.beginTransaction()
    const tx = conn!

    // process uploaded files first (attach to survey_files)
    const fileIdMap: Record<string, number[]> = {}
    const files = (req.files as any[]) || []
    if (files.length > 0) {
      for (const f of files) {
        const key = String(f.fieldname ?? '')
        const purpose = (() => {
          if (f.fieldname === 'signPhoto') return 'sign'
          if (f.fieldname === 'fcpOverview') return 'fcp_overview'
          if (f.fieldname === 'fcpNameplate') return 'fcp_nameplate'
          if (f.fieldname === 'fcpInside') return 'fcp_inside'
          if (f.fieldname && f.fieldname.startsWith('equip-')) return 'equipment'
          return 'attachment'
        })()
        const storagePath = f.path || f.filename || ''
        const [r] = await tx.query(`INSERT INTO survey_files (survey_id, purpose, storage_path, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)`, [id, purpose, storagePath, f.originalname || null, f.mimetype || null, f.size || 0])
        const fid = (r as any).insertId
        if (!fileIdMap[key]) fileIdMap[key] = []
        fileIdMap[key].push(fid)
      }
    }

    await tx.query(`UPDATE surveys SET survey_date = ?, project_name = ?, floors = ?, visit_type = ?, status = ?, notes = ?, surveyed_by = ?, submitted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      payload.surveyDate ?? null,
      payload.projectName ?? null,
      payload.floors ?? null,
      payload.visitType ?? null,
      payload.status ?? 'draft',
      payload.notes ?? null,
      payload.surveyedBy ?? null,
      payload.submittedAt ?? null,
      id,
    ])

    // replace contacts: delete then insert (simple approach)
    await tx.query(`DELETE FROM survey_contacts WHERE survey_id = ?`, [id])
    if (Array.isArray(payload.contacts)) {
      for (const c of payload.contacts) {
        await tx.query(`INSERT INTO survey_contacts (survey_id, seq, name, position, phone) VALUES (?, ?, ?, ?, ?)`, [id, c.seq ?? 1, c.name ?? null, c.position ?? null, c.phone ?? null])
      }
    }

    // location replace
    await tx.query(`DELETE FROM survey_locations WHERE survey_id = ?`, [id])
    if (payload.location) {
      const loc = payload.location
      const countryCode = (typeof loc.country === 'string' && loc.country.length === 2) ? loc.country.toUpperCase() : 'TH'
      await tx.query(`INSERT INTO survey_locations (survey_id, latitude, longitude, address_line, subdistrict_name, district_name, province_name, postal_code, postal_code_id, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        loc.latitude ?? null,
        loc.longitude ?? null,
        loc.address ?? null,
        loc.subdistrict ?? null,
        loc.district ?? null,
        loc.province ?? null,
        loc.postalCode ?? null,
        loc.postalCodeId ?? null,
        countryCode,
      ])
    }

    // fcp
    await tx.query(`DELETE FROM survey_fcp WHERE survey_id = ?`, [id])
    if (payload.fcp) {
      const f = payload.fcp
      const overviewId = fileIdMap['fcpOverview'] ? fileIdMap['fcpOverview'][0] : (f.overviewFileId ?? null)
      const nameplateId = fileIdMap['fcpNameplate'] ? fileIdMap['fcpNameplate'][0] : (f.nameplateFileId ?? null)
      const insideId = fileIdMap['fcpInside'] ? fileIdMap['fcpInside'][0] : (f.insideFileId ?? null)
      await tx.query(`INSERT INTO survey_fcp (survey_id, brand, model, panel_type, cabinet_material, power_status, overview_file_id, nameplate_file_id, inside_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        f.brand ?? null,
        f.model ?? null,
        f.type ?? null,
        f.material ?? null,
        f.status ?? null,
        overviewId,
        nameplateId,
        insideId,
      ])
    }

    // equipment: delete existing and reinsert
    await tx.query(`DELETE FROM survey_equipment WHERE survey_id = ?`, [id])
    if (Array.isArray(payload.equipment)) {
      let order = 0
      for (let i = 0; i < payload.equipment.length; i++) {
        const e = payload.equipment[i]
        order += 1
        const equipField = `equip-${i}`
        const photoId = fileIdMap[equipField] ? fileIdMap[equipField][0] : (e.photoFileId ?? null)
        await tx.query(`INSERT INTO survey_equipment (survey_id, equipment_type_id, custom_name, is_present, model, quantity, photo_file_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
          id,
          e.equipmentTypeId ?? null,
          e.customName ?? null,
          e.isPresent ? 1 : 0,
          e.model ?? null,
          e.qty ?? null,
          photoId,
          order,
        ])
      }
    }

    await tx.commit()
    const updated = await getSurveyById(id)
    res.json(updated)
  } catch (err: any) {
    if (conn) await conn.rollback()
    console.error('update survey failed', err)
    // In development, return error message/stack to help debugging. In production, keep generic.
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ error: 'update failed', message: err?.message, stack: err?.stack })
    }
    res.status(500).json({ error: 'update failed' })
  } finally {
    if (conn) conn.release()
  }
}
