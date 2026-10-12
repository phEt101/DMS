import { db } from '../../../config/database.js'
import type { Request, Response } from 'express'
import { listSurveys, getSurveyById, deleteSurveyById } from '../repositories/surveys.repository.js'
import { logSurveyChange } from '../repositories/survey-logs.repository.js'

/* -------------------------------------------------------------------------- */
/* Activity log (survey_logs)                                                 */
/* -------------------------------------------------------------------------- */

type SurveySnapshot = Record<string, any>

/** YYYY-MM-DD ตามเวลา Bangkok (รองรับ Date object / ISO string) */
function ymd(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
  }
  return String(value).slice(0, 10)
}

function comparableValue(value: unknown) {
  return value === undefined || value === '' ? null : value
}

/** ค่าที่ต้องการเทียบก่อน/หลังแก้ไข (รองรับหลายรูปแบบที่ repository อาจคืนมา) */
function surveyLogValues(s: SurveySnapshot): SurveySnapshot {
  const contact = s.contact1 ?? s.contacts?.[0] ?? {}
  const loc = s.location ?? {}
  const fcp = s.fcp ?? {}
  const equipment = Array.isArray(s.equipment) ? s.equipment : []
  return {
    surveyDate: ymd(s.surveyDate),
    projectName: s.projectName,
    floors: s.floors,
    visitType: s.visitType,
    status: s.status,
    notes: s.notes,
    contactName: contact.name,
    contactPhone: contact.phone,
    contactPosition: contact.position,
    address: loc.address ?? loc.address_line,
    subdistrict: loc.subdistrict ?? loc.subdistrict_name,
    district: loc.district ?? loc.district_name,
    province: loc.province ?? loc.province_name,
    postalCode: loc.postalCode ?? loc.postal_code,
    fcpBrand: s.fcpBrand ?? fcp.brand,
    fcpModel: s.fcpModel ?? fcp.model,
    fcpType: s.fcpType ?? fcp.type ?? fcp.panel_type,
    fcpMaterial: s.fcpMaterial ?? fcp.material ?? fcp.cabinet_material,
    fcpStatus: s.fcpStatus ?? fcp.status ?? fcp.power_status,
    equipmentCount: equipment.filter((e: any) => e?.isPresent ?? e?.is_present).length,
  }
}

function surveyChanges(before: SurveySnapshot, after: SurveySnapshot) {
  const from = surveyLogValues(before)
  const to = surveyLogValues(after)
  return Object.keys(to).flatMap((field) => {
    const previous = comparableValue(from[field])
    const next = comparableValue(to[field])
    return String(previous ?? '') === String(next ?? '') ? [] : [{ field, from: previous, to: next }]
  })
}

// log ต้องไม่ทำให้การเปลี่ยนแปลงที่ commit แล้วกลายเป็น request ที่ล้มเหลว
async function logSurveyActivity(
  req: Request,
  action: 'created' | 'updated' | 'deleted',
  survey: SurveySnapshot,
  details: Record<string, unknown> = {},
) {
  try {
    await logSurveyChange({
      // หลังลบแล้วแถวใน surveys ไม่มี ต้องส่ง NULL ไม่งั้นชน FK
      surveyId: action === 'deleted' ? null : (survey.id as number),
      surveyNo: survey.surveyNo ?? null,
      projectName: survey.projectName ?? null,
      userId: (req as any).user?.id ?? null,
      action,
      details: {
        name: survey.projectName ?? null,
        surveyNo: survey.surveyNo ?? null,
        ...(action === 'deleted' ? { surveyId: survey.id } : {}),
        ...details,
      },
      ipAddress: req.ip,
    })
  } catch (err) {
    console.error('survey activity log failed', err)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function parsePayload(req: Request): { ok: true; payload: any } | { ok: false } {
  try {
    const raw = req.body?.payload
    const payload = raw ? JSON.parse(raw) : req.body
    if (!payload || typeof payload !== 'object') return { ok: false }
    return { ok: true, payload }
  } catch {
    return { ok: false }
  }
}

function mapVisitType(v: any): 'survey_by_sale' | 'survey_by_sale_service' | null {
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  if (!s) return null
  if (s === 'contact_new' || s === 'contact-new' || s === 'contact') return 'survey_by_sale'
  if (s === 'ref_doc' || s === 'ref-doc' || s === 'ref') return 'survey_by_sale_service'
  if (s === 'survey_by_sale' || s === 'survey_by_sale_service') return s
  if (s === 'เยี่ยมขาย' || s === 'survey_by_sale_th') return 'survey_by_sale'
  if (s === 'เยี่ยมขายและเซอร์วิส' || s === 'survey_by_sale_service_th') return 'survey_by_sale_service'
  return null
}

function normalizeFcpPowerStatus(v: any): 'on' | 'off' | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (['on', 'powered', '1', 'true', 'yes'].includes(s)) return 'on'
    if (['off', '0', 'false', 'no'].includes(s)) return 'off'
    return null
  }
  if (typeof v === 'number') return v === 1 ? 'on' : v === 0 ? 'off' : null
  if (typeof v === 'boolean') return v ? 'on' : 'off'
  return null
}

function normalizeFloors(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  const intVal = Math.trunc(n)
  if (intVal < 0) return null
  return Math.min(intVal, 10000)
}

type FilePurpose = 'sign' | 'fcp_overview' | 'fcp_nameplate' | 'fcp_inside' | 'equipment'

function resolvePurpose(fieldname: unknown): FilePurpose | null {
  const f = String(fieldname ?? '')
  if (f === 'signPhoto') return 'sign'
  if (f === 'fcpOverview') return 'fcp_overview'
  if (f === 'fcpNameplate') return 'fcp_nameplate'
  if (f === 'fcpInside') return 'fcp_inside'
  if (f.startsWith('equip-')) return 'equipment'
  return null
}

function findUnknownFile(files: any[]): string | null {
  for (const f of files) {
    if (!resolvePurpose(f.fieldname)) return String(f.fieldname ?? '')
  }
  return null
}

async function saveUploadedFiles(tx: any, surveyId: number, files: any[]) {
  const fileIdMap: Record<string, number[]> = {}
  for (const f of files) {
    const key = String(f.fieldname ?? '')
    const purpose = resolvePurpose(key)!
    const storagePath = f.path || f.filename || ''
    const [r] = await tx.query(
      `INSERT INTO survey_files (survey_id, purpose, storage_path, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)`,
      [surveyId, purpose, storagePath, f.originalname || null, f.mimetype || 'application/octet-stream', f.size || 0],
    )
    const fid = (r as any).insertId
    ;(fileIdMap[key] ||= []).push(fid)
    if (purpose === 'sign') {
      await tx.query(`UPDATE surveys SET sign_file_id = ? WHERE id = ?`, [fid, surveyId])
    }
  }
  return fileIdMap
}

async function insertContacts(tx: any, surveyId: number, contacts: any[]) {
  for (const c of contacts) {
    await tx.query(
      `INSERT INTO survey_contacts (survey_id, seq, name, position, phone) VALUES (?, ?, ?, ?, ?)`,
      [surveyId, c.seq ?? 1, c.name ?? null, c.position ?? null, c.phone ?? null],
    )
  }
}

async function insertLocation(tx: any, surveyId: number, loc: any) {
  const countryCode = typeof loc.country === 'string' && loc.country.length === 2 ? loc.country.toUpperCase() : 'TH'
  await tx.query(
    `INSERT INTO survey_locations (survey_id, latitude, longitude, address_line, subdistrict_name, district_name, province_name, postal_code, postal_code_id, country_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      surveyId,
      loc.latitude ?? null,
      loc.longitude ?? null,
      loc.address ?? null,
      loc.subdistrict ?? null,
      loc.district ?? null,
      loc.province ?? null,
      loc.postalCode ?? null,
      loc.postalCodeId ?? null,
      countryCode,
    ],
  )
}

async function insertFcp(tx: any, surveyId: number, f: any, fileIdMap: Record<string, number[]>) {
  const overviewId = fileIdMap['fcpOverview']?.[0] ?? f.overviewFileId ?? null
  const nameplateId = fileIdMap['fcpNameplate']?.[0] ?? f.nameplateFileId ?? null
  const insideId = fileIdMap['fcpInside']?.[0] ?? f.insideFileId ?? null
  await tx.query(
    `INSERT INTO survey_fcp (survey_id, brand, model, panel_type, cabinet_material, power_status, overview_file_id, nameplate_file_id, inside_file_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      surveyId,
      f.brand ?? null,
      f.model ?? null,
      f.type ?? null,
      f.material ?? null,
      normalizeFcpPowerStatus(f.status ?? null),
      overviewId,
      nameplateId,
      insideId,
    ],
  )
}

async function insertEquipment(tx: any, surveyId: number, equipment: any[], fileIdMap: Record<string, number[]>) {
  for (let i = 0; i < equipment.length; i++) {
    const e = equipment[i]
    const photoId = fileIdMap[`equip-${i}`]?.[0] ?? e.photoFileId ?? null
    await tx.query(
      `INSERT INTO survey_equipment (survey_id, equipment_type_id, custom_name, is_present, model, quantity, photo_file_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        surveyId,
        e.equipmentTypeId ?? null,
        e.customName ?? null,
        e.isPresent ? 1 : 0,
        e.model ?? null,
        e.qty ?? null,
        photoId,
        i + 1,
      ],
    )
  }
}

function missingForSubmit(data: any): string[] {
  const missing: string[] = []
  if (!data.surveyDate) missing.push('surveyDate')
  if (!data.projectName) missing.push('projectName')
  const contacts = Array.isArray(data.contacts) ? data.contacts : []
  const primary = contacts[0] || {}
  if (!primary.name) missing.push('contacts[0].name')
  if (!primary.phone) missing.push('contacts[0].phone')
  if (!primary.position) missing.push('contacts[0].position')
  return missing
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

export async function handleListSurveys(_req: Request, res: Response) {
  try {
    res.json(await listSurveys())
  } catch (err) {
    console.error('list surveys failed', err)
    res.status(500).json({ error: 'list failed' })
  }
}

export async function handleGetSurvey(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })
  try {
    const survey = await getSurveyById(id)
    if (!survey) return res.status(404).json({ error: 'Not found' })
    res.json(survey)
  } catch (err) {
    console.error('get survey failed', err)
    res.status(500).json({ error: 'get failed' })
  }
}

export async function handleDeleteSurvey(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })
  try {
    // ต้องอ่านก่อนลบ เพื่อเก็บชื่อไว้ใน log
    const existing = await getSurveyById(id)
    const ok = await deleteSurveyById(id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    await logSurveyActivity(req, 'deleted', existing ?? { id })
    res.status(204).send()
  } catch (err) {
    console.error('delete survey failed', err)
    res.status(500).json({ error: 'delete failed' })
  }
}

export async function handleCreateSurvey(req: Request, res: Response) {
  const parsed = parsePayload(req)
  if (!parsed.ok) return res.status(400).json({ error: 'invalid payload' })
  const payload = parsed.payload

  // ---- validate ก่อนเปิด transaction ----
  if (payload.status === 'submitted') {
    const missing = missingForSubmit(payload)
    if (missing.length > 0) return res.status(400).json({ error: 'validation failed', missing })
  }

  const incomingVisitRaw = payload.visitType ?? payload.visit_type
  const visitType = mapVisitType(incomingVisitRaw)
  if (incomingVisitRaw && visitType === null) {
    return res.status(400).json({ error: 'validation failed', field: 'visitType', message: `invalid value: ${String(incomingVisitRaw)}` })
  }

  if (payload.fcp?.status && normalizeFcpPowerStatus(payload.fcp.status) === null) {
    return res.status(400).json({ error: 'validation failed', field: 'fcp.status', message: `invalid value: ${String(payload.fcp.status)}` })
  }

  const files = (req.files as any[]) || []
  const unknownFile = findUnknownFile(files)
  if (unknownFile !== null) {
    return res.status(400).json({ error: 'validation failed', field: 'files', message: `unsupported file field: ${unknownFile}` })
  }

  const surveyNo = payload.surveyNo ?? payload.survey_no ?? `SV-${new Date().getFullYear()}-${Date.now()}`
  const status = payload.status || 'draft'
  const submittedAt = payload.submittedAt ?? (status === 'submitted' ? new Date() : null)

  let conn: any | undefined
  try {
    conn = await db.getConnection()
    await conn.beginTransaction()

    const [result] = await conn.query(
      `INSERT INTO surveys (survey_no, survey_date, project_name, floors, visit_type, status, notes, surveyed_by, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        surveyNo,
        payload.surveyDate || null,
        payload.projectName || null,
        normalizeFloors(payload.floors),
        visitType,
        status,
        payload.notes || null,
        payload.surveyedBy ?? null,
        submittedAt,
      ],
    )
    const insertId = (result as any).insertId

    const fileIdMap = await saveUploadedFiles(conn, insertId, files)
    if (Array.isArray(payload.contacts)) await insertContacts(conn, insertId, payload.contacts)
    if (payload.location) await insertLocation(conn, insertId, payload.location)
    if (payload.fcp) await insertFcp(conn, insertId, payload.fcp, fileIdMap)
    if (Array.isArray(payload.equipment)) await insertEquipment(conn, insertId, payload.equipment, fileIdMap)

    await conn.commit()

    const created = await getSurveyById(insertId)
    if (created) {
      const v = surveyLogValues(created)
      await logSurveyActivity(req, 'created', created, {
        status: v.status ?? null,
        surveyDate: v.surveyDate ?? null,
        contactName: v.contactName ?? null,
        province: v.province ?? null,
      })
    }
    res.status(201).json(created)
  } catch (err) {
    if (conn) await conn.rollback().catch(() => undefined)
    console.error('create survey failed', err)
    res.status(500).json({ error: 'create failed' })
  } finally {
    if (conn) conn.release()
  }
}

export async function handleUpdateSurvey(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid id' })

  const parsed = parsePayload(req)
  if (!parsed.ok) return res.status(400).json({ error: 'invalid payload' })
  const payload = parsed.payload

  let existing: any
  try {
    existing = await getSurveyById(id)
  } catch (err) {
    console.error('load survey failed', err)
    return res.status(500).json({ error: 'update failed' })
  }
  if (!existing) return res.status(404).json({ error: 'Not found' })

  // ---- validate ก่อนเปิด transaction ----
  const merged: any = { ...existing, ...payload }
  if (merged.status === 'submitted') {
    if (!Array.isArray(merged.contacts) || merged.contacts.length === 0) {
      merged.contacts = [existing.contact1, existing.contact2].filter(Boolean)
    }
    const missing = missingForSubmit(merged)
    if (missing.length > 0) return res.status(400).json({ error: 'validation failed', missing })
  }

  const incomingVisitRaw = payload.visitType ?? payload.visit_type
  const normalizedIncomingVisit = incomingVisitRaw !== undefined ? mapVisitType(incomingVisitRaw) : undefined
  if (incomingVisitRaw !== undefined && incomingVisitRaw !== null && incomingVisitRaw !== '' && normalizedIncomingVisit === null) {
    return res.status(400).json({ error: 'validation failed', field: 'visitType', message: `invalid value: ${String(incomingVisitRaw)}` })
  }

  if (payload.fcp?.status && normalizeFcpPowerStatus(payload.fcp.status) === null) {
    return res.status(400).json({ error: 'validation failed', field: 'fcp.status', message: `invalid value: ${String(payload.fcp.status)}` })
  }

  const files = (req.files as any[]) || []
  const unknownFile = findUnknownFile(files)
  if (unknownFile !== null) {
    return res.status(400).json({ error: 'validation failed', field: 'files', message: `unsupported file field: ${unknownFile}` })
  }

  // ---- ค่าสุดท้ายของ survey (ไม่ทับค่าเดิมถ้า payload ไม่ส่งมา) ----
  const finalSurveyDate = payload.surveyDate ?? existing.surveyDate ?? null
  const finalProjectName = payload.projectName ?? existing.projectName ?? null
  const finalFloors = normalizeFloors(payload.floors ?? existing.floors ?? null)
  const finalVisitType = normalizedIncomingVisit !== undefined ? normalizedIncomingVisit : (existing.visitType ?? null)
  const finalStatus = payload.status ?? existing.status ?? 'draft'
  const finalNotes = payload.notes ?? existing.notes ?? null
  const finalSurveyedBy = payload.surveyedBy ?? existing.surveyedBy ?? null
  const finalSubmittedAt =
    finalStatus === 'submitted'
      ? (payload.submittedAt ?? existing.submittedAt ?? new Date())
      : (payload.submittedAt ?? existing.submittedAt ?? null)

  let conn: any | undefined
  try {
    conn = await db.getConnection()
    await conn.beginTransaction()

    const fileIdMap = await saveUploadedFiles(conn, id, files)

    await conn.query(
      `UPDATE surveys SET survey_date = ?, project_name = ?, floors = ?, visit_type = ?, status = ?, notes = ?, surveyed_by = ?, submitted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        finalSurveyDate,
        finalProjectName,
        finalFloors,
        finalVisitType,
        finalStatus,
        finalNotes,
        finalSurveyedBy,
        finalSubmittedAt,
        id,
      ],
    )

    // contacts: แทนที่เฉพาะเมื่อส่งมา
    if (Array.isArray(payload.contacts)) {
      await conn.query(`DELETE FROM survey_contacts WHERE survey_id = ?`, [id])
      await insertContacts(conn, id, payload.contacts)
    }

    // location: แทนที่เฉพาะเมื่อส่งมา
    if (payload.location) {
      await conn.query(`DELETE FROM survey_locations WHERE survey_id = ?`, [id])
      await insertLocation(conn, id, payload.location)
    }

    // fcp: แทนที่เมื่อส่งมา หรือมีไฟล์ fcp ใหม่
    const fcpFileKeysPresent = Object.keys(fileIdMap).some((k) => ['fcpOverview', 'fcpNameplate', 'fcpInside'].includes(k))
    if (payload.fcp || fcpFileKeysPresent) {
      await conn.query(`DELETE FROM survey_fcp WHERE survey_id = ?`, [id])
      if (payload.fcp) await insertFcp(conn, id, payload.fcp, fileIdMap)
    }

    // equipment: แทนที่เมื่อส่งมา หรือมีไฟล์อุปกรณ์ใหม่
    const equipFileKeysPresent = Object.keys(fileIdMap).some((k) => k.startsWith('equip-'))
    if (Array.isArray(payload.equipment) || equipFileKeysPresent) {
      await conn.query(`DELETE FROM survey_equipment WHERE survey_id = ?`, [id])
      if (Array.isArray(payload.equipment)) await insertEquipment(conn, id, payload.equipment, fileIdMap)
    }

    await conn.commit()

    const updated = await getSurveyById(id)
    if (updated) {
      const changes = surveyChanges(existing, updated)
      // ไม่มีอะไรเปลี่ยน (และไม่มีรูปใหม่) ก็ไม่ต้อง log
      if (changes.length > 0 || files.length > 0) {
        await logSurveyActivity(req, 'updated', updated, { changes })
      }
    }
    res.json(updated)
  } catch (err: any) {
    if (conn) await conn.rollback().catch(() => undefined)
    console.error('update survey failed', err)
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ error: 'update failed', message: err?.message, stack: err?.stack })
    }
    res.status(500).json({ error: 'update failed' })
  } finally {
    if (conn) conn.release()
  }
}