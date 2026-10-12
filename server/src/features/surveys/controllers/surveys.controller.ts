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
function mapVisitType(v: any) {
  // Allowed DB enum values
  const allowed = new Set(['survey_by_sale', 'survey_by_sale_service'])
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  if (!s) return null
  // map some known legacy keys
  if (s === 'contact_new' || s === 'contact-new' || s === 'contact') return 'survey_by_sale'
  if (s === 'ref_doc' || s === 'ref-doc' || s === 'ref') return 'survey_by_sale_service'
  // accept already normalized enum values
  if (allowed.has(s)) return s
  // allow some common localized variants (Thai)
  if (s === 'เยี่ยมขาย' || s === 'survey_by_sale_th' ) return 'survey_by_sale'
  if (s === 'เยี่ยมขายและเซอร์วิส' || s === 'survey_by_sale_service_th') return 'survey_by_sale_service'
  // unknown/unsupported value -> return null to avoid DB enum truncation
  return null
}

// Normalize FCP power status to values allowed by the DB enum (currently 'on'|'off')
function normalizeFcpPowerStatus(v: any): 'on' | 'off' | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'on' || s === 'powered' || s === '1' || s === 'true' || s === 'yes') return 'on'
    if (s === 'off' || s === '0' || s === 'false' || s === 'no') return 'off'
    return null
  }
  if (typeof v === 'number') {
    return v === 1 ? 'on' : v === 0 ? 'off' : null
  }
  if (typeof v === 'boolean') return v ? 'on' : 'off'
  return null
}

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

    // normalize and validate visitType to accept legacy values but reject unsupported ones
    const incomingVisitRaw = payload.visitType ?? payload.visit_type
    const normalizedVisitType = incomingVisitRaw !== undefined ? mapVisitType(incomingVisitRaw) : mapVisitType(null)
    if (incomingVisitRaw !== undefined && normalizedVisitType === null) {
      // invalid visit type provided
      await tx.rollback()
      if (conn) conn.release()
      return res.status(400).json({ error: 'validation failed', field: 'visitType', message: `invalid value: ${String(incomingVisitRaw)}` })
    }

    // insert surveys first
    const [result] = await tx.query(`INSERT INTO surveys (survey_no, survey_date, project_name, floors, visit_type, status, notes, surveyed_by, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      surveyNo,
      payload.surveyDate || null,
      payload.projectName || null,
      payload.floors ?? null,
      normalizedVisitType || null,
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
        // if this is the sign photo, set surveys.sign_file_id to the newly inserted file id for easier lookup
        if (purpose === 'sign') {
          await tx.query(`UPDATE surveys SET sign_file_id = ? WHERE id = ?`, [fid, insertId])
        }
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
      const normalizedPower = normalizeFcpPowerStatus(f.status ?? null)
      if (f.status && normalizedPower === null) {
        // rollback transaction and return validation error for invalid enum
        await tx.rollback()
        if (conn) conn.release()
        return res.status(400).json({ error: 'validation failed', field: 'fcp.status', message: `invalid value: ${String(f.status)}` })
      }
      await tx.query(`INSERT INTO survey_fcp (survey_id, brand, model, panel_type, cabinet_material, power_status, overview_file_id, nameplate_file_id, inside_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        insertId,
        f.brand ?? null,
        f.model ?? null,
        f.type ?? null,
        f.material ?? null,
        normalizedPower ?? null,
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

  // Load existing survey to allow partial updates (so a status-only update won't wipe other fields)
  const existing = await getSurveyById(Number(req.params.id))
  if (!existing) return res.status(404).json({ error: 'Not found' })

  // Merge existing values with incoming payload to validate the final state when marking as submitted
  const merged = { ...existing, ...payload }

  // server-side validation when final state is submitted
  if (merged && merged.status === 'submitted') {
    const missing: string[] = []
    if (!merged.surveyDate) missing.push('surveyDate')
    if (!merged.projectName) missing.push('projectName')
    const contacts = Array.isArray(merged.contacts) ? merged.contacts : (merged.contact1 || merged.contacts || [])
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
        const [r] = await tx.query(`INSERT INTO survey_files (survey_id, purpose, storage_path, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)`, [Number(req.params.id), purpose, storagePath, f.originalname || null, f.mimetype || null, f.size || 0])
        const fid = (r as any).insertId
        if (!fileIdMap[key]) fileIdMap[key] = []
        fileIdMap[key].push(fid)
        // if this is the sign photo, update surveys.sign_file_id for easier lookup
        if (purpose === 'sign') {
          await tx.query(`UPDATE surveys SET sign_file_id = ? WHERE id = ?`, [fid, Number(req.params.id)])
        }
      }
    }

    // compute final values to avoid overwriting existing fields when payload omits them
    const finalSurveyDate = payload.surveyDate ?? existing.surveyDate ?? null
    const finalProjectName = payload.projectName ?? existing.projectName ?? null
    const finalFloors = payload.floors ?? existing.floors ?? null
    // determine incoming visitType (if provided) and validate
    const incomingVisitRaw = payload.visitType ?? payload.visit_type
    const normalizedIncomingVisit = incomingVisitRaw !== undefined ? mapVisitType(incomingVisitRaw) : undefined
    if (incomingVisitRaw !== undefined && normalizedIncomingVisit === null) {
      await tx.rollback()
      if (conn) conn.release()
      return res.status(400).json({ error: 'validation failed', field: 'visitType', message: `invalid value: ${String(incomingVisitRaw)}` })
    }
  
    const finalStatus = payload.status ?? existing.status ?? 'draft'
    const finalNotes = payload.notes ?? existing.notes ?? null
    const finalSurveyedBy = payload.surveyedBy ?? existing.surveyedBy ?? null
    const finalSubmittedAt = payload.submittedAt ?? existing.submittedAt ?? null

    await tx.query(`UPDATE surveys SET survey_date = ?, project_name = ?, floors = ?, visit_type = ?, status = ?, notes = ?, surveyed_by = ?, submitted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      finalSurveyDate ?? null,
      finalProjectName ?? null,
      finalFloors ?? null,
      finalStatus ?? 'draft',
      finalNotes ?? null,
      finalSurveyedBy ?? null,
      finalSubmittedAt ?? null,
      Number(req.params.id),
    ])

    // replace contacts only if provided in payload
    if (Array.isArray(payload.contacts)) {
      await tx.query(`DELETE FROM survey_contacts WHERE survey_id = ?`, [Number(req.params.id)])
      for (const c of payload.contacts) {
        await tx.query(`INSERT INTO survey_contacts (survey_id, seq, name, position, phone) VALUES (?, ?, ?, ?, ?)`, [Number(req.params.id), c.seq ?? 1, c.name ?? null, c.position ?? null, c.phone ?? null])
      }
    }

    // location replace only if provided
    if (payload.location) {
      await tx.query(`DELETE FROM survey_locations WHERE survey_id = ?`, [Number(req.params.id)])
      const loc = payload.location
      const countryCode = (typeof loc.country === 'string' && loc.country.length === 2) ? loc.country.toUpperCase() : 'TH'
      await tx.query(`INSERT INTO survey_locations (survey_id, latitude, longitude, address_line, subdistrict_name, district_name, province_name, postal_code, postal_code_id, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        Number(req.params.id),
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

    // fcp replace only if provided or fcp files uploaded
    const fcpFileKeysPresent = Object.keys(fileIdMap).some(k => ['fcpOverview','fcpNameplate','fcpInside'].includes(k))
    if (payload.fcp || fcpFileKeysPresent) {
      await tx.query(`DELETE FROM survey_fcp WHERE survey_id = ?`, [Number(req.params.id)])
      if (payload.fcp) {
        const f = payload.fcp
        const overviewId = fileIdMap['fcpOverview'] ? fileIdMap['fcpOverview'][0] : (f.overviewFileId ?? null)
        const nameplateId = fileIdMap['fcpNameplate'] ? fileIdMap['fcpNameplate'][0] : (f.nameplateFileId ?? null)
        const insideId = fileIdMap['fcpInside'] ? fileIdMap['fcpInside'][0] : (f.insideFileId ?? null)
        const normalizedPower = normalizeFcpPowerStatus(f.status ?? null)
        if (f.status && normalizedPower === null) {
          await tx.rollback()
          if (conn) conn.release()
          return res.status(400).json({ error: 'validation failed', field: 'fcp.status', message: `invalid value: ${String(f.status)}` })
        }
        await tx.query(`INSERT INTO survey_fcp (survey_id, brand, model, panel_type, cabinet_material, power_status, overview_file_id, nameplate_file_id, inside_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          Number(req.params.id),
          f.brand ?? null,
          f.model ?? null,
          f.type ?? null,
          f.material ?? null,
          normalizedPower ?? null,
          overviewId,
          nameplateId,
          insideId,
        ])
      }
    }

    // equipment: replace only if provided or equipment files uploaded
    const equipFileKeysPresent = Object.keys(fileIdMap).some(k => k.startsWith('equip-'))
    if (Array.isArray(payload.equipment) || equipFileKeysPresent) {
      await tx.query(`DELETE FROM survey_equipment WHERE survey_id = ?`, [Number(req.params.id)])
      if (Array.isArray(payload.equipment)) {
        let order = 0
        for (let i = 0; i < payload.equipment.length; i++) {
          const e = payload.equipment[i]
          order += 1
          const equipField = `equip-${i}`
          const photoId = fileIdMap[equipField] ? fileIdMap[equipField][0] : (e.photoFileId ?? null)
          await tx.query(`INSERT INTO survey_equipment (survey_id, equipment_type_id, custom_name, is_present, model, quantity, photo_file_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            Number(req.params.id),
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
    }

    await tx.commit()
    const updated = await getSurveyById(Number(req.params.id))
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
