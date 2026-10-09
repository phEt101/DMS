import { db } from '../../../config/database.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

export interface SurveyRow extends RowDataPacket {
  id: number
  survey_no?: string | null
  survey_date: string | null
  project_name: string | null
  floors?: number | null
  visit_type?: string | null
  status: string
  notes?: string | null
  surveyed_by?: number | null
  submitted_at?: string | null
  created_at: string
  updated_at: string
}

export async function listSurveys(): Promise<any[]> {
  // Return a richer list view by joining contacts (primary), location and a thumbnail if available
  const [rows] = await db.query<any[]>(
    `SELECT s.id, s.survey_no, s.survey_date, s.project_name, s.floors, s.status, s.created_at, s.updated_at,
            c.name AS contact_name, c.phone AS contact_phone, c.position AS contact_position,
            l.province_name AS province, l.district_name AS district, l.subdistrict_name AS subdistrict,
            sf.id AS sign_file_id,
            sfcp.brand AS fcp_brand, sfcp.model AS fcp_model
     FROM surveys s
     LEFT JOIN survey_contacts c ON c.survey_id = s.id AND c.seq = 1
     LEFT JOIN survey_locations l ON l.survey_id = s.id
     LEFT JOIN survey_files sf ON sf.survey_id = s.id AND sf.purpose = 'sign'
     LEFT JOIN survey_fcp sfcp ON sfcp.survey_id = s.id
     ORDER BY s.created_at DESC LIMIT 1000`
  )

  return rows.map((r: any) => ({
    id: r.id,
    surveyNo: r.survey_no,
    surveyDate: r.survey_date,
    projectName: r.project_name,
    floors: r.floors,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    contact1: r.contact_name ? { name: r.contact_name, phone: r.contact_phone, position: r.contact_position } : undefined,
    province: r.province,
    district: r.district,
    subdistrict: r.subdistrict,
    signPhoto: r.sign_file_id ? `/boswell-api/v1/surveys/files/${r.sign_file_id}` : null,
    fcpBrand: r.fcp_brand ?? null,
    fcpModel: r.fcp_model ?? null,
  }))
}

function mapVisitType(v: any) {
  if (!v) return null
  if (v === 'contact_new') return 'survey_by_sale'
  if (v === 'ref_doc') return 'survey_by_sale_service'
  return v
}

export async function getSurveyById(id: number) {
  const conn = await db.getConnection()
  try {
    // main survey
    const [rows] = await conn.query<SurveyRow[]>(`SELECT * FROM surveys WHERE id = ? LIMIT 1`, [id])
    const survey = rows[0]
    if (!survey) return null

    // contacts
    const [contacts] = await conn.query<RowDataPacket[]>(`SELECT seq, name, position, phone FROM survey_contacts WHERE survey_id = ? ORDER BY seq ASC`, [id])

    // location
    const [locations] = await conn.query<RowDataPacket[]>(`SELECT latitude, longitude, address_line, subdistrict_name AS subdistrict, district_name AS district, province_name AS province, postal_code, postal_code_id, country_code FROM survey_locations WHERE survey_id = ? LIMIT 1`, [id])
    const rawLocation = locations[0] ?? null

    // fcp
    const [fcps] = await conn.query<RowDataPacket[]>(`SELECT brand, model, panel_type AS type, cabinet_material AS material, power_status AS status, overview_file_id, nameplate_file_id, inside_file_id FROM survey_fcp WHERE survey_id = ? LIMIT 1`, [id])
    const fcp = fcps[0] ?? null

    // equipment (include equipment type name when available)
    const [equipment] = await conn.query<RowDataPacket[]>(`
      SELECT se.id, se.equipment_type_id, et.name AS type_name, se.custom_name, se.is_present AS isPresent, se.model, se.quantity AS qty, se.photo_file_id
      FROM survey_equipment se
      LEFT JOIN equipment_types et ON et.id = se.equipment_type_id
      WHERE se.survey_id = ?
      ORDER BY se.sort_order ASC, se.id ASC
    `, [id])

    // collect file ids to fetch storage paths (include sign photo if present)
    const fileIds: number[] = []
    const [signFiles] = await conn.query<RowDataPacket[]>(`SELECT id FROM survey_files WHERE survey_id = ? AND purpose = 'sign' ORDER BY id DESC LIMIT 1`, [id])
    if (signFiles[0] && signFiles[0].id) fileIds.push(signFiles[0].id)

    if (rawLocation && rawLocation.postal_code_id) fileIds.push(rawLocation.postal_code_id)
    if (fcp) {
      if (fcp.overview_file_id) fileIds.push(fcp.overview_file_id)
      if (fcp.nameplate_file_id) fileIds.push(fcp.nameplate_file_id)
      if (fcp.inside_file_id) fileIds.push(fcp.inside_file_id)
    }
    equipment.forEach((e) => { if (e.photo_file_id) fileIds.push(Number(e.photo_file_id)) })

    let filesMap: Record<number, RowDataPacket> = {}
    if (fileIds.length > 0) {
      const [files] = await conn.query<RowDataPacket[]>(`SELECT id, storage_path, original_name, mime_type FROM survey_files WHERE id IN (?)`, [fileIds])
      filesMap = Object.fromEntries(files.map((f: any) => [f.id, f]))
    }

    // attach file urls as a backend-served URL
    const equipItems = equipment.map((e: any, idx: number) => ({
      id: e.id,
      equipmentTypeId: e.equipment_type_id,
      customName: e.custom_name,
      isPresent: Boolean(e.isPresent || e.is_present),
      name: e.custom_name || `Item ${idx + 1}`,
      model: e.model,
      qty: e.qty !== undefined ? Number(e.qty) : undefined,
      photo: e.photo_file_id ? `/boswell-api/v1/surveys/files/${e.photo_file_id}` : null,
    }))

    // normalize location to frontend shape
    const location = rawLocation ? {
      latitude: rawLocation.latitude !== null ? Number(rawLocation.latitude) : undefined,
      longitude: rawLocation.longitude !== null ? Number(rawLocation.longitude) : undefined,
      address: rawLocation.address_line ?? rawLocation.address ?? null,
      subdistrict: rawLocation.subdistrict ?? null,
      district: rawLocation.district ?? null,
      province: rawLocation.province ?? null,
      postalCode: rawLocation.postal_code ?? null,
      postalCodeId: rawLocation.postal_code_id ?? null,
      country: rawLocation.country_code ?? null,
    } : null

    // contacts normalized
    const contact1 = contacts && contacts.length > 0 ? contacts[0] : null
    const contact2 = contacts && contacts.length > 1 ? contacts[1] : null

    const result = {
      id: survey.id,
      surveyNo: survey.survey_no,
      surveyDate: survey.survey_date,
      projectName: survey.project_name,
      floors: survey.floors,
      visitType: mapVisitType(survey.visit_type),
      status: survey.status,
      notes: survey.notes,
      surveyedBy: survey.surveyed_by,
      submittedAt: survey.submitted_at,
      createdAt: survey.created_at,
      updatedAt: survey.updated_at,
      contacts,
      contact1,
      contact2,
      location,
      signPhoto: signFiles[0] && signFiles[0].id ? `/boswell-api/v1/surveys/files/${signFiles[0].id}` : null,
      fcpBrand: fcp ? fcp.brand : null,
      fcpModel: fcp ? fcp.model : null,
      fcpType: fcp ? fcp.type : null,
      fcpMaterial: fcp ? fcp.material : null,
      fcpStatus: fcp ? fcp.status : null,
      fcpOverview: fcp && fcp.overview_file_id ? `/boswell-api/v1/surveys/files/${fcp.overview_file_id}` : null,
      fcpNameplate: fcp && fcp.nameplate_file_id ? `/boswell-api/v1/surveys/files/${fcp.nameplate_file_id}` : null,
      fcpInside: fcp && fcp.inside_file_id ? `/boswell-api/v1/surveys/files/${fcp.inside_file_id}` : null,
      equipment: equipItems,
    }

    return result
  } finally {
    conn.release()
  }
}

export async function deleteSurveyById(id: number) {
  const [res] = await db.query<ResultSetHeader>(`DELETE FROM surveys WHERE id = ?`, [id])
  return res.affectedRows > 0
}

// create/update will be handled by repository functions using transaction in controller
