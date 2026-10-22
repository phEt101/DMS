import type { Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { db } from '../../../config/database.js'
import { httpError } from '../../../middleware/errors.js'
import { validateRequest, type Kind, type LeaveTypeRow, type Policy, type ValidationContext, type Values } from '../services/employee-requests.validation.js'
import { logActivity } from '../../settings/activity/repositories/activity.repository.js'
import { medicalCertificateDirectory } from '../middleware/medical-certificate-upload.middleware.js'

// ใช้สิทธิ์เดิมของโมดูลเอกสาร + เพิ่ม 'จัดการนโยบายการลา' 1 รายการ (ต้อง seed ในตาราง permissions)
const PERM = { submit: 'ยื่นเอกสาร', review: 'พิจารณาเอกสาร', policy: 'จัดการนโยบายการลา' }
const KINDS: Kind[] = ['leave', 'ot', 'timefix', 'wfh', 'outing']
const PREFIX: Record<Kind, string> = { leave: 'LV', ot: 'OT', timefix: 'TF', wfh: 'WFH', outing: 'OUT' }
const STATUSES = ['pending_mgr', 'pending_exec', 'pending_hr', 'approved', 'rejected', 'cancelled']
const MAX_SIGNATURE_LENGTH = 200_000

async function storeSignatureImage(conn: any, image: string): Promise<number> {
  const contentHash = createHash('sha256').update(image).digest('hex')
  const [result] = await conn.execute(
    `INSERT INTO signature_images (content_hash, signature_image) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [contentHash, image],
  )
  return Number(result.insertId)
}

const has = (req: Request, name: string) => {
  return Boolean(req.user?.permissions.some((permission) => permission.name === name))
}
const need = (req: Request, name: string) => { if (!has(req, name)) throw httpError(403, 'ไม่มีสิทธิ์ดำเนินการกับเอกสาร') }
const needDocumentModule = (req: Request) => {
  const allowed = req.user && (req.user.role.name.trim().toLowerCase() === 'admin'
    || req.user.departmentModules.some((module) => module === 'documents' || module.startsWith('documents_') || module === 'report'))
  if (!allowed) throw httpError(403, 'ไม่มีสิทธิ์เข้าถึงเอกสาร')
}
// req.user มี company ในรูป { id, name, logoUrl } ตาม require-auth.middleware.ts
const companyIdOf = (req: Request) => {
  const raw = (req.user as any)?.company?.id ?? (req.user as any)?.companyId
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(403, 'ไม่พบริษัทของผู้ใช้')
  return id
}
const todayBangkok = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const idParam = (req: Request) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'Invalid request id')
  return id
}
// helper (วางใกล้ๆ const nz)
const parseFlowJson = (value: unknown): any => {
  if (!value) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(String(value)) } catch { return null }
}
const stageKeyOf = { pending_mgr: 'manager', pending_exec: 'executive', pending_hr: 'hr' } as const
// snapshot ของ flow ณ ตอนยื่น — เก็บลง flow_json เพื่อให้เอกสารเก่าแสดงขั้นตอนตามกฎที่ใช้ตอนยื่น แม้กฎจะถูกแก้ไปภายหลัง
const flowSnapshotOf = (flow: ReturnType<typeof computeFlow>) => {
  const stages = [flow.firstStage, ...flow.nextStages]
  return {
    manager: stages.includes('pending_mgr'),
    executive: stages.includes('pending_exec'),
    hr: stages.includes('pending_hr'),
    recordAfterStage: flow.recordAfterStage,
    visibleInRecords: flow.visibleInRecords !== false,
    stages,
  }
}
// snapshot ในรูปที่ frontend ใช้แสดงขั้นตอน (stages เป็น manager/executive/hr + ขั้นบันทึก)
const flowViewOf = (row: { flow_json?: unknown } | null | undefined) => {
  const snap = parseFlowJson(row?.flow_json)
  return snap && Array.isArray(snap.stages)
    ? {
        stages: (snap.stages as string[]).map((s) => stageKeyOf[s as keyof typeof stageKeyOf]).filter(Boolean),
        recordAfterStage: snap.hr === true || snap.stages.includes('pending_hr') ? 'hr' : snap.recordAfterStage ?? null,
      }
    : null
}
const nz = (value: unknown) => { const text = String(value ?? '').trim(); return text || null }
const num = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && String(value ?? '') !== '' ? n : null }
const camel = (text: string) => text.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const camelize = (row: any) => Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value]))
const checkSignature = (value: unknown, required: boolean) => {
  const image = String(value ?? '')
  if (!image) { if (required) throw httpError(400, 'กรุณาลงลายมือชื่อ'); return null }
  if (!image.startsWith('data:image/png;base64,') || image.length > MAX_SIGNATURE_LENGTH) throw httpError(400, 'ลายมือชื่อไม่ถูกต้อง')
  return image
}

// ---------- นโยบาย ----------
const policyRow = (r: any): Policy & { expiryDate: string } => ({
  id: r.id, year: r.policy_year, yearStart: r.year_start, yearEnd: r.year_end, expiryDate: r.year_end,
  leadPersonal: Number(r.lead_days_personal), leadVacation: Number(r.lead_workdays_vacation),
  hoursPerDay: Number(r.hours_per_day), hourStep: Number(r.hour_step), certDays: Number(r.certificate_days),
  otMax: Number(r.ot_max_hours), fixDays: Number(r.timefix_max_days_back),
})
const POLICY_SELECT = `SELECT id, policy_year, DATE_FORMAT(year_start,'%Y-%m-%d') AS year_start, DATE_FORMAT(year_end,'%Y-%m-%d') AS year_end,
  lead_days_personal, lead_workdays_vacation, hours_per_day, hour_step, certificate_days, ot_max_hours, timefix_max_days_back FROM leave_policies`

async function loadPolicy(companyId: number, today: string) {
  const [rows] = await db.query<any[]>(
    `${POLICY_SELECT} WHERE company_id = ? AND is_active = 1
      ORDER BY (year_start <= ? AND year_end >= ?) DESC, policy_year DESC LIMIT 1`, [companyId, today, today],
  )
  if (!rows[0]) throw httpError(409, 'ยังไม่ได้ตั้งค่านโยบายการลา')
  return policyRow(rows[0])
}

export async function policy(req: Request, res: Response) {
  needDocumentModule(req)
  res.json(await loadPolicy(companyIdOf(req), todayBangkok()))
}

export async function updatePolicy(req: Request, res: Response) {
  need(req, PERM.policy)
  const roleName = String(req.user!.role?.name ?? '').trim().toLocaleLowerCase()
  const departmentName = String(req.user!.department ?? '').trim().toLocaleLowerCase()
  if (roleName !== 'admin' && departmentName !== 'hr div.') throw httpError(403, 'ไม่มีสิทธิ์จัดการนโยบายการลา')
  const companyId = companyIdOf(req), b = req.body ?? {}
  const year = Number(b.year), yearStart = String(b.yearStart ?? ''), yearEnd = String(b.yearEnd ?? '')
  if (!Number.isSafeInteger(year) || year < 2500 || year > 2700) throw httpError(400, 'ปีนโยบายไม่ถูกต้อง')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yearStart) || !/^\d{4}-\d{2}-\d{2}$/.test(yearEnd) || yearEnd < yearStart) throw httpError(400, 'ช่วงปีการลาไม่ถูกต้อง')
  const fields = {
    leadPersonal: num(b.leadPersonal), leadVacation: num(b.leadVacation), hoursPerDay: num(b.hoursPerDay), hourStep: num(b.hourStep),
    certDays: num(b.certDays), otMax: num(b.otMax), fixDays: num(b.fixDays),
  }
  if (Object.values(fields).some((value) => value === null || value < 0)) throw httpError(400, 'ค่านโยบายไม่ถูกต้อง')
  if (fields.hoursPerDay! <= 0 || fields.hourStep! <= 0) throw httpError(400, 'ชั่วโมงต่อวันและหน่วยการลาต้องมากกว่า 0')
  const [previousRows] = await db.query<any[]>(
    `SELECT id, DATE_FORMAT(year_start, '%Y-%m-%d') AS year_start, DATE_FORMAT(year_end, '%Y-%m-%d') AS year_end,
       lead_days_personal, lead_workdays_vacation,
       hours_per_day, hour_step, certificate_days, ot_max_hours, timefix_max_days_back
     FROM leave_policies WHERE company_id = ? AND policy_year = ? LIMIT 1`, [companyId, year],
  )
  const previous = previousRows[0]
  const policyChanges = [
    { field: 'yearStart', from: previous?.year_start ?? null, to: yearStart },
    { field: 'yearEnd', from: previous?.year_end ?? null, to: yearEnd },
    { field: 'leadPersonal', from: previous ? Number(previous.lead_days_personal) : null, to: fields.leadPersonal },
    { field: 'leadVacation', from: previous ? Number(previous.lead_workdays_vacation) : null, to: fields.leadVacation },
    { field: 'hoursPerDay', from: previous ? Number(previous.hours_per_day) : null, to: fields.hoursPerDay },
    { field: 'hourStep', from: previous ? Number(previous.hour_step) : null, to: fields.hourStep },
    { field: 'certDays', from: previous ? Number(previous.certificate_days) : null, to: fields.certDays },
    { field: 'otMax', from: previous ? Number(previous.ot_max_hours) : null, to: fields.otMax },
    { field: 'fixDays', from: previous ? Number(previous.timefix_max_days_back) : null, to: fields.fixDays },
  ].filter((change) => change.from !== change.to)
  await db.execute(
    `INSERT INTO leave_policies (company_id, policy_year, year_start, year_end, lead_days_personal, lead_workdays_vacation,
       hours_per_day, hour_step, certificate_days, ot_max_hours, timefix_max_days_back, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE year_start = VALUES(year_start), year_end = VALUES(year_end),
       lead_days_personal = VALUES(lead_days_personal), lead_workdays_vacation = VALUES(lead_workdays_vacation),
       hours_per_day = VALUES(hours_per_day), hour_step = VALUES(hour_step), certificate_days = VALUES(certificate_days),
       ot_max_hours = VALUES(ot_max_hours), timefix_max_days_back = VALUES(timefix_max_days_back), updated_by = VALUES(updated_by)`,
    [companyId, year, yearStart, yearEnd, fields.leadPersonal, fields.leadVacation, fields.hoursPerDay, fields.hourStep,
      fields.certDays, fields.otMax, fields.fixDays, req.user!.id],
  )
  const [rows] = await db.query<any[]>(`${POLICY_SELECT} WHERE company_id = ? AND policy_year = ? LIMIT 1`, [companyId, year])
  if (policyChanges.length > 0) {
    await logActivity({
      userId: req.user!.id,
      module: 'documents',
      action: 'policy_updated',
      entityType: 'leave_policy',
      entityId: rows[0].id,
      details: { year, changes: policyChanges },
      ipAddress: req.ip,
    })
  }
  res.json(policyRow(rows[0]))
}

// ---------- ลายเซ็นที่จดจำไว้ ----------
export async function mySignature(req: Request, res: Response) {
  needDocumentModule(req)
  const [rows] = await db.query<any[]>(
    `SELECT image.signature_image FROM user_saved_signatures saved
       JOIN signature_images image ON image.id = saved.signature_file_id
      WHERE saved.user_id = ? LIMIT 1`, [req.user!.id],
  )
  res.json({ signature: rows[0]?.signature_image ?? '' })
}
export async function saveMySignature(req: Request, res: Response) {
  needDocumentModule(req)
  const image = checkSignature(req.body?.signature, true)
  if (!image) throw httpError(400, 'กรุณาลงลายมือชื่อ')
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const signatureFileId = await storeSignatureImage(conn, image)
    await conn.execute(
      `INSERT INTO user_saved_signatures (user_id, signature_file_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE signature_file_id = VALUES(signature_file_id)`,
      [req.user!.id, signatureFileId],
    )
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  res.status(204).end()
}

// ---------- helper: manager ทุกคนในแผนกเห็น/อนุมัติใบลูกน้องได้ ----------
// แผนกที่ manager ที่ล็อกอินดูแลอยู่ (null ถ้าไม่ใช่ role manager) — ตอนใส่ใน SQL ใช้ `?? -1` เพื่อไม่ให้ match
const myManagedDeptId = async (conn: any, req: Request): Promise<number | null> => {
  if (String(req.user!.role?.name ?? '') !== 'manager') return null
  const [rows] = await conn.query(
    `SELECT department_id FROM users WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`, [req.user!.id],
  )
  return rows[0]?.department_id ? Number(rows[0].department_id) : null
}

// ---------- รายการ / รายละเอียด ----------
export async function index(req: Request, res: Response) {
  needDocumentModule(req)
  const companyId = companyIdOf(req), me = req.user!.id
  // HR = มีสิทธิ์พิจารณา + อยู่แผนก HR Div. (กัน role user ที่โดนแถมสิทธิ์มองเห็นทั้งบริษัท)
  const isHr = has(req, PERM.review) && String((req.user as any)?.department ?? '').trim().toLowerCase() === 'hr div.'
  const listRoleName = String(req.user!.role?.name ?? '')
  const listIsExec = listRoleName === 'executive'
  const isAdmin = listRoleName === 'admin'
  const canViewCompanyCertificates = isAdmin || await isHrDivisionMember(me, companyId)
  const myDept = await myManagedDeptId(db as any, req)
  const status = String(req.query.status ?? 'all'), kind = String(req.query.kind ?? 'all'), awaitingMe = req.query.awaiting === 'me', mineOnly = req.query.mine === 'me'
  if (status !== 'all' && status !== 'pending' && !STATUSES.includes(status)) throw httpError(400, 'Invalid status')
  if (!['all', 'leave', 'ot', 'other', ...KINDS].includes(kind)) throw httpError(400, 'Invalid kind')

  const where = ['r.company_id = ?'], params: any[] = [companyId]
  // มองเห็น: admin/HR เห็นทั้งหมด · executive เห็นของตัวเอง, pending_exec และเอกสารที่ตนอนุมัติ · manager เห็นของตัวเอง + ที่ผูกกับตน + ทั้งแผนกที่ตนดูแล · คนอื่นเห็นของตัวเอง
  if (isAdmin) { /* ทุกเอกสาร */ }
  else if (isHr) { /* ทุกเอกสาร */ }
  else if (listIsExec) {
    where.push(`(r.employee_user_id = ? OR r.manager_user_id = ? OR r.status = 'pending_exec'
      OR EXISTS (
        SELECT 1 FROM employee_request_signatures signed
         WHERE signed.request_id = r.id AND signed.signer_user_id = ? AND signed.stage = 'executive' AND signed.action = 'approved'
      ))`)
    params.push(me, me, me)
  }
  else { where.push('(r.employee_user_id = ? OR r.manager_user_id = ? OR r.department_id = ?)'); params.push(me, me, myDept ?? -1) }
  // ของตัวเองเท่านั้น (ปุ่มสลับ "ของตัวเอง" บนหน้าเอกสารรายบุคคล)
  if (mineOnly && !awaitingMe) { where.push('r.employee_user_id = ?'); params.push(me) }
  if (status === 'pending') where.push(`r.status IN ('pending_mgr','pending_exec','pending_hr')`)
  else if (status !== 'all') { where.push('r.status = ?'); params.push(status) }
  const employeeId = req.query.employeeId === undefined ? null : Number(req.query.employeeId)
  if (employeeId !== null) {
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) throw httpError(400, 'Invalid employee id')
    where.push('r.employee_user_id = ?'); params.push(employeeId)
  }
  if (kind === 'other') where.push(`r.kind IN ('timefix','wfh','outing')`)
  else if (kind !== 'all') { where.push('r.kind = ?'); params.push(kind) }
  if (awaitingMe) {
    // status คือขั้นปัจจุบันที่ compute จาก flow snapshot แล้ว จึงไม่ต้องอ่าน JSON ใน SQL
    // (ฐาน production ใช้ MySQL 5.6 ซึ่งไม่มี JSON_EXTRACT)
    const execFilter = listIsExec ? `OR r.status = 'pending_exec'` : ''
    const hrFilter = isHr ? `OR r.status = 'pending_hr'` : ''
    where.push(`r.employee_user_id <> ? AND ((r.status = 'pending_mgr' AND (r.manager_user_id = ? OR r.department_id = ?)) ${execFilter} ${hrFilter})`)
    params.push(me, me, myDept ?? -1)
  }
  const [rows] = await db.query<any[]>(
    `SELECT r.id, r.request_no, r.kind, r.status, r.days, r.reason, r.rejection_note, r.rejected_stage, r.submitted_at,
            DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
            r.employee_user_id, eu.name AS employee_name, dep.name AS department_name,
            lt.code AS leave_type, ot.hours AS ot_hours, ot.task AS ot_task,
            COALESCE(wfh.place, outing.place) AS place,
            (medical_certificate.request_id IS NOT NULL) AS medical_certificate_available,
            sm.signer_name AS mgr_signer_name, DATE_FORMAT(sm.signed_at,'%Y-%m-%d') AS mgr_signed_at,
            se.signer_name AS exec_signer_name, DATE_FORMAT(se.signed_at,'%Y-%m-%d') AS exec_signed_at,
            sh.signer_name AS hr_signer_name, DATE_FORMAT(sh.signed_at,'%Y-%m-%d') AS hr_signed_at,
            smi.signature_image AS mgr_signature_image, sei.signature_image AS exec_signature_image, shi.signature_image AS hr_signature_image,
            ss.signer_name AS submitter_name, ssi.signature_image AS submitter_signature_image
       FROM employee_requests r
       JOIN users eu ON eu.id = r.employee_user_id
       LEFT JOIN departments dep ON dep.id = r.department_id
       LEFT JOIN employee_request_leave_details dl ON dl.request_id = r.id
       LEFT JOIN leave_types lt ON lt.id = dl.leave_type_id
       LEFT JOIN employee_request_ot_details ot ON ot.request_id = r.id
       LEFT JOIN employee_request_wfh_details wfh ON wfh.request_id = r.id
       LEFT JOIN employee_request_outing_details outing ON outing.request_id = r.id
       LEFT JOIN employee_request_medical_certificates medical_certificate ON medical_certificate.request_id = r.id
        LEFT JOIN employee_request_signatures sm ON sm.request_id = r.id AND sm.stage = 'manager' AND sm.action = 'approved'
       LEFT JOIN employee_request_signatures se ON se.request_id = r.id AND se.stage = 'executive' AND se.action = 'approved'
       LEFT JOIN employee_request_signatures sh ON sh.request_id = r.id AND sh.stage = 'hr' AND sh.action = 'approved'
       LEFT JOIN employee_request_signatures ss ON ss.request_id = r.id AND ss.stage = 'submitter' AND ss.action = 'submitted'
        LEFT JOIN signature_images smi ON smi.id = sm.signature_file_id
        LEFT JOIN signature_images sei ON sei.id = se.signature_file_id
        LEFT JOIN signature_images shi ON shi.id = sh.signature_file_id
        LEFT JOIN signature_images ssi ON ssi.id = ss.signature_file_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.submitted_at DESC, r.id DESC LIMIT 1000`, params,
  )
  res.json(rows.map((row) => ({
    ...camelize(row),
    medicalCertificateAvailable: Boolean(row.medical_certificate_available)
      && (canViewCompanyCertificates || Number(row.employee_user_id) === me),
    days: row.days === null ? null : Number(row.days),
    otHours: row.ot_hours === null ? null : Number(row.ot_hours),
  })))
}

const DETAIL_SQL: Record<Kind, string> = {
  leave: `SELECT lt.code AS leave_type, dl.by_hour, TIME_FORMAT(dl.start_time,'%H:%i') AS start_time, TIME_FORMAT(dl.end_time,'%H:%i') AS end_time,
                 dl.hours, dl.has_medical_certificate
            FROM employee_request_leave_details dl JOIN leave_types lt ON lt.id = dl.leave_type_id WHERE dl.request_id = ?`,
  ot: `SELECT day_type, DATE_FORMAT(work_date,'%Y-%m-%d') AS date, TIME_FORMAT(start_time,'%H:%i') AS start_time,
              TIME_FORMAT(end_time,'%H:%i') AS end_time, hours, task FROM employee_request_ot_details WHERE request_id = ?`,
  timefix: `SELECT DATE_FORMAT(fix_date,'%Y-%m-%d') AS date, cause, TIME_FORMAT(in_time,'%H:%i') AS in_time,
                   TIME_FORMAT(out_time,'%H:%i') AS out_time FROM employee_request_timefix_details WHERE request_id = ?`,
  wfh: `SELECT place, plan FROM employee_request_wfh_details WHERE request_id = ?`,
  outing: `SELECT DATE_FORMAT(outing_date,'%Y-%m-%d') AS date, TIME_FORMAT(out_time,'%H:%i') AS out_time,
                  TIME_FORMAT(back_time,'%H:%i') AS back_time, place, company_name, address, province, district,
                  subdistrict, postal_code, country, latitude, longitude, project_name, customer_name,
                  customer_position, phone, work_details, remark
                                FROM employee_request_outing_details WHERE request_id = ?`,
             }

async function isHrDivisionMember(userId: number, companyId: number): Promise<boolean> {
  const [rows] = await db.query<any[]>(
    `SELECT 1 FROM users u
       JOIN departments d ON d.id = u.department_id
      WHERE u.id = ? AND u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL
        AND LOWER(TRIM(d.name)) = 'hr div.' AND d.deleted_at IS NULL LIMIT 1`,
    [userId, companyId],
  )
  return rows.length > 0
}

async function canViewMedicalCertificate(userId: number, ownerId: number, companyId: number, roleName: string): Promise<boolean> {
  return roleName.trim().toLowerCase() === 'admin'
    || userId === ownerId
    || await isHrDivisionMember(userId, companyId)
}

export async function show(req: Request, res: Response) {
  needDocumentModule(req)
  const id = idParam(req), companyId = companyIdOf(req), me = req.user!.id, isHr = has(req, PERM.review)
  const detailRoleName = String(req.user!.role?.name ?? '')
  const detailIsExec = detailRoleName === 'executive'
  const detailIsAdmin = detailRoleName === 'admin'
  const myDept = await myManagedDeptId(db as any, req)
  const [rows] = await db.query<any[]>(
    `SELECT r.id, r.request_no, r.kind, r.status, r.days, r.reason, r.rejection_note, r.rejected_stage, r.submitted_at, r.decided_at,
            DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
            r.employee_user_id, r.manager_user_id, r.department_id, r.flow_json, eu.name AS employee_name, dep.name AS department_name
       FROM employee_requests r JOIN users eu ON eu.id = r.employee_user_id LEFT JOIN departments dep ON dep.id = r.department_id
      WHERE r.id = ? AND r.company_id = ? LIMIT 1`, [id, companyId],
  )
  const row = rows[0]
  // manager ทุกคนในแผนกเดียวกับใบ (department_id snapshot ตอนยื่น) เห็น/อนุมัติขั้น manager ได้
  const isDeptMgr = Boolean(row) && myDept !== null && Number(row.department_id) === myDept
  const [signedRows] = detailIsExec && row
    ? await db.query<any[]>(
        `SELECT 1 FROM employee_request_signatures
          WHERE request_id = ? AND signer_user_id = ? AND stage = 'executive' AND action = 'approved' LIMIT 1`,
        [id, me],
      )
    : [[]]
  const signedByMe = signedRows.length > 0
  if (!row || !(detailIsAdmin || isHr || row.employee_user_id === me || row.manager_user_id === me || isDeptMgr
    || (detailIsExec && (row.status === 'pending_exec' || signedByMe)))) throw httpError(404, 'Request not found')
  const detailSql = DETAIL_SQL[row.kind as Kind]
  if (!detailSql) throw httpError(404, 'Request not found')
  const [detailRows] = await db.query<any[]>(detailSql, [id])
  const detail = detailRows[0] ? camelize(detailRows[0]) as any : null
  const [certificateRows] = await db.query<any[]>(
    `SELECT request_id FROM employee_request_medical_certificates WHERE request_id = ? LIMIT 1`, [id],
  )
  const canViewCertificate = await canViewMedicalCertificate(me, Number(row.employee_user_id), companyId, detailRoleName)
  const hasCertificateFile = certificateRows.length > 0
  if (detail && row.kind === 'leave') {
    detail.byHour = Boolean(detail.byHour)
    detail.hasMedicalCertificate = canViewCertificate && hasCertificateFile
    detail.medicalCertificateAvailable = canViewCertificate && hasCertificateFile
  }
  const [signatures] = await db.query<any[]>(
    `SELECT signature.stage, signature.action, signature.signer_name, image.signature_image, signature.note, signature.signed_at
       FROM employee_request_signatures signature
       LEFT JOIN signature_images image ON image.id = signature.signature_file_id
      WHERE signature.request_id = ? ORDER BY signature.signed_at, signature.id`, [id],
  )
  const notSelf = row.employee_user_id !== me
  const isExec = detailIsExec, isAdmin = detailIsAdmin
  // ขั้น HR: ใครใน HR Div. อนุมัติก็ได้ (ยกเว้นผู้ยื่น) — ถ้าไม่มี HR คนอื่น admin fallback
  const otherHrIds = await findHrUserIds(db as any, companyId, row.employee_user_id)
  const isAdminFallback = isAdmin && otherHrIds.length === 0
  // ขั้น HR: เฉพาะสมาชิก HR Div. (ยกเว้นผู้ยื่น) — ถ้าไม่มี HR คนอื่น admin fallback
  const hrMemberIds = await findHrUserIds(db as any, companyId)
  const isHrMember = hrMemberIds.includes(me)
  const { manager_user_id: _manager, executive_user_id: _exec, department_id: _dep, flow_json: _flow, ...publicRow } = row as any
  res.json({
    ...camelize(publicRow), days: row.days === null ? null : Number(row.days), detail, signatures: signatures.map(camelize),
    flow: flowViewOf(row),
    canViewMedicalCertificate: canViewCertificate,
    canApprove: notSelf && (
      (row.status === 'pending_mgr' && (row.manager_user_id === me || isDeptMgr))
      || (row.status === 'pending_exec' && (isExec || isAdmin))
      || (row.status === 'pending_hr' && ((isHrMember && !isAdminFallback) || isAdminFallback))
    ),
    canCancel: !notSelf && (
      row.status === 'pending_mgr'
      || row.status === 'pending_exec'
      || (row.status === 'pending_hr' && row.manager_user_id === null)
    ),
  })
}

// ---------- แจ้งเตือน ----------
const notify = async (conn: any, userIds: number[], requestId: number, event: string) => {
  const ids = [...new Set(userIds)].filter((userId) => Number.isSafeInteger(userId))
  if (!ids.length) return
  await conn.query(`INSERT INTO employee_request_notifications (recipient_user_id, request_id, event) VALUES ?`, [ids.map((userId) => [userId, requestId, event])])
}

// ---------- ยื่นเอกสาร ----------
// ทีม HR: ทุก active user ในแผนก 'HR Div.' ของบริษัทนี้
// excludeUserId = ผู้ยื่น (HR อนุมัติเอกสารของตัวเองไม่ได้ — ต้องให้ HR อีกคนเซ็น)
const findHrUserIds = async (conn: any, companyId: number, excludeUserId?: number): Promise<number[]> => {
  const [rows] = await conn.query(
    `SELECT DISTINCT u.id FROM users u
       JOIN departments d ON d.id = u.department_id AND d.name = 'HR Div.' AND d.deleted_at IS NULL
      WHERE u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL
        AND u.id <> COALESCE(?, -1)`, [companyId, excludeUserId ?? null],
  )
  return (rows as any[]).map((row: any) => Number(row.id))
}
// ผู้ประกอบการ (role executive) — ถ้าไม่มี fallback เป็น admin
const findExecUserIds = async (conn: any, companyId: number): Promise<number[]> => {
  const [rows] = await conn.query(
    `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id AND r.name = 'executive' AND r.deleted_at IS NULL
      WHERE u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL`, [companyId],
  )
  const ids = (rows as any[]).map((row: any) => Number(row.id))
  if (ids.length) return ids
  const [fallback] = await conn.query(
    `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id AND r.name = 'admin' AND r.deleted_at IS NULL
      WHERE u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL`, [companyId],
  )
  return (fallback as any[]).map((row: any) => Number(row.id))
}
// ผู้จัดการแผนกของผู้ยื่น:
//   1) manager ที่ระบุไว้ใน employees.manager_user_id (ถ้ามีและยัง active + เป็น manager ของบริษัทเดียวกัน)
//   2) fallback: user คนอื่นในแผนกเดียวกันที่ role = manager (ตัวอย่างเช่น HR ไม่ได้ผูก manager ไว้)
const findDeptManagerId = async (conn: any, departmentId: number, submitterId: number, defaultManagerId: number | null): Promise<number | null> => {
  if (defaultManagerId && Number.isSafeInteger(Number(defaultManagerId)) && Number(defaultManagerId) !== submitterId) {
    const [assigned] = await conn.query(
      `SELECT u.id FROM users u
         JOIN roles r ON r.id = u.role_id AND r.name = 'manager' AND r.deleted_at IS NULL
        WHERE u.id = ? AND u.company_id = (SELECT company_id FROM users WHERE id = ?) AND u.is_active = 1 AND u.deleted_at IS NULL
        LIMIT 1`, [Number(defaultManagerId), submitterId],
    )
    if (assigned[0]) return Number(assigned[0].id)
  }
  if (!departmentId) return null
  const [rows] = await conn.query(
    `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id AND r.name = 'manager' AND r.deleted_at IS NULL
      WHERE u.department_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL AND u.id <> ?
      ORDER BY u.id LIMIT 1`, [departmentId, submitterId],
  )
  return rows[0] ? Number(rows[0].id) : null
}
// manager ทุกคนในแผนก (ไว้แจ้งเตือนตอนยื่น)
const findDeptManagerIds = async (conn: any, companyId: number, departmentId: number | null, excludeUserId: number): Promise<number[]> => {
  if (!departmentId) return []
  const [rows] = await conn.query(
    `SELECT u.id FROM users u
       JOIN roles r ON r.id = u.role_id AND r.name = 'manager' AND r.deleted_at IS NULL
      WHERE u.department_id = ? AND u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL AND u.id <> ?`,
    [departmentId, companyId, excludeUserId],
  )
  return (rows as any[]).map((row: any) => Number(row.id))
}
// ขั้นแรกตาม role + แผนกของผู้ยื่นสำหรับ flow เริ่มต้น
const firstStage = (user: any): 'pending_mgr' | 'pending_exec' | 'pending_hr' => {
  const role = String(user.role_name ?? '').trim().toLowerCase()
  if (role === 'executive') return 'pending_hr'
  if (user.isHrDept) return 'pending_exec'
  if (role === 'user' || role === 'admin') return user.manager_user_id ? 'pending_mgr' : 'pending_hr'
  return 'pending_exec'
}

// ---------- กำหนดสิทธิ์ในการยื่นเอกสาร (Flow Rules) ----------
// กฎที่แอดมิน/HR ตั้งในหน้า "กำหนดสิทธิ์การยื่นเอกสาร" — ระบุว่าแผนก/บทบาทไหนยื่นแล้วส่งไปให้ใครอนุมัติ
// เอกสารจะเก็บ snapshot ของ flow ที่ใช้ (flow JSON) ไว้ที่ตัวเอกสาร เพื่อให้ขั้นถัดไปตามกฎเดิมแม้กฎถูกแก้ภายหลัง
const FLOW_KINDS = [...KINDS, 'all']
type FlowRuleRow = {
  scope: 'department' | 'role'; departmentId: number | null; roleId: number | null; kind: string;
  /** กลุ่มเป้าหมาย: แผนก/บทบาทหลายตัวในกฎเดียว (ว่าง = ทั้งหมดใน scope) */
  targetIds: number[];
  /** กลุ่มบทบาทเพิ่มเติม — กฎจับคู่เมื่อผู้ยื่นอยู่ใน targetIds (ถ้าระบุ) และ roleIds (ถ้าระบุ) */
  roleIds: number[];
  firstStage: 'default' | 'pending_mgr' | 'pending_exec' | 'pending_hr';
  managerUserId: number | null; executiveUserId: number | null;
  requireManagerStage: boolean; requireExecutiveStage: boolean; requireHrStage: boolean;
  recordAfterStage: 'manager' | 'executive' | 'hr' | null; visibleInRecords: boolean;
}
const FLOW_DEFAULT = {
  managerUserId: null as number | null, executiveUserId: null as number | null,
  requireManagerStage: true, requireExecutiveStage: false, requireHrStage: true,
  recordAfterStage: null as 'manager' | 'executive' | 'hr' | null, visibleInRecords: true,
}
const defaultFlowFor = (user: any) => {
  const role = String(user.role_name ?? '').trim().toLowerCase()
  const isHrSubmitter = role === 'hr' || Boolean(Number(user.isHrDept))
  if (role === 'executive') {
    return { requireManagerStage: false, requireExecutiveStage: false, requireHrStage: true }
  }
  if (role === 'manager' || isHrSubmitter) {
    return { requireManagerStage: false, requireExecutiveStage: true, requireHrStage: true }
  }
  return { requireManagerStage: true, requireExecutiveStage: false, requireHrStage: true }
}
const flowRuleRow = (r: any): FlowRuleRow => ({
  scope: String(r.scope) as FlowRuleRow['scope'], departmentId: r.department_id === null ? null : Number(r.department_id),
  roleId: r.role_id === null ? null : Number(r.role_id), kind: String(r.kind),
  targetIds: Array.isArray(r.targetIds)
    ? r.targetIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isSafeInteger(value))
    : [],
  roleIds: Array.isArray(r.roleIds)
    ? r.roleIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isSafeInteger(value))
    : [],
  firstStage: String(r.first_stage) as FlowRuleRow['firstStage'],
  managerUserId: r.manager_user_id === null ? null : Number(r.manager_user_id),
  executiveUserId: r.executive_user_id === null ? null : Number(r.executive_user_id),
  requireManagerStage: Boolean(Number(r.require_manager_stage)),
  requireExecutiveStage: Boolean(Number(r.require_executive_stage)),
  requireHrStage: Boolean(Number(r.require_hr_stage)),
  recordAfterStage: (r.record_after_stage === null || r.record_after_stage === undefined) ? null : String(r.record_after_stage) as FlowRuleRow['recordAfterStage'],
  visibleInRecords: r.visible_in_records === undefined ? true : Boolean(Number(r.visible_in_records)),
})
// เลือกกฎที่ match ผู้ยื่น + ประเภทเอกสาร (kind เจาะจงกว่า all; กฎที่ระบุทั้งแผนก+บทบาทเจาะจงที่สุด)
// กฎหนึ่งระบุกลุ่มได้: targetIds (แผนก หรือ บทบาทหลัก ตาม scope), roleIds (กรองบทบาทเพิ่ม) — ว่าง = ไม่จำกัด
const matchFlowRule = (rules: FlowRuleRow[], user: any, kind: Kind): FlowRuleRow | null => {
  const deptId = Number(user.department_id ?? -1)
  const userRoleId = Number(user.role_id ?? -1)
  const inList = (list: number[], id: number) => list.length === 0 || list.includes(id)
  const matches = rules.filter((rule) =>
    (rule.kind === 'all' || rule.kind === kind) && (
      rule.scope === 'department'
        ? inList(rule.targetIds, deptId) && inList(rule.roleIds, userRoleId)
        : rule.targetIds.includes(userRoleId) && inList(rule.roleIds, userRoleId)
    ),
  )
  // เจาะจงมากขึ้นได้คะแนนมากกว่า: ระบุแผนก > ระบุบทบาท > kind เจาะจง
  const rank = (rule: FlowRuleRow) =>
    (rule.scope === 'department' ? 2 : 1) * 4 + (rule.kind === kind ? 2 : 0)
      + (rule.scope === 'department' && rule.targetIds.length ? 1 : 0) + (rule.roleIds.length ? 1 : 0)
  return matches.sort((left, right) => rank(right) - rank(left))[0] ?? null
}
// คำนวณ flow ทั้งหมดของเอกสาร: ขั้นแรก + ลำดับขั้นที่เหลือ + ผู้อนุมัติที่กำหนดเอง
const computeFlow = (rule: FlowRuleRow | null, user: any, deptManagerId: number | null) => {
  const managerUserId = rule?.managerUserId ?? deptManagerId
  const executiveUserId = rule?.executiveUserId ?? null
  const defaults = defaultFlowFor(user)
  const mgr = Boolean(rule ? rule.requireManagerStage : defaults.requireManagerStage)
  const exec = Boolean(rule ? rule.requireExecutiveStage : defaults.requireExecutiveStage)
  const hr = Boolean(rule ? rule.requireHrStage : defaults.requireHrStage)
  let first: 'pending_mgr' | 'pending_exec' | 'pending_hr'
  if (!rule || rule.firstStage === 'default') first = firstStage({ ...user, manager_user_id: managerUserId })
  else first = rule.firstStage
  const stages: Array<'pending_mgr' | 'pending_exec' | 'pending_hr'> = []
  if (mgr) stages.push('pending_mgr')
  if (exec) stages.push('pending_exec')
  if (hr) stages.push('pending_hr')
  if (stages.length === 0) stages.push('pending_hr')
  if (!stages.includes(first)) first = stages[0]!
  const nextStages = stages.slice(stages.indexOf(first) + 1)
  // ถ้าต้องผ่าน HR ให้จบและบันทึกหลัง HR เท่านั้น
  const lastStage = stages[stages.length - 1]!
  const stageToStatus = { manager: 'pending_mgr', executive: 'pending_exec', hr: 'pending_hr' } as const
  const recordAfterStage = hr
    ? 'hr'
    : rule?.recordAfterStage && stages.includes(stageToStatus[rule.recordAfterStage])
      ? rule.recordAfterStage
      : ({ manager: 'manager', executive: 'executive', hr: 'hr' } as const)[lastStage === 'pending_mgr' ? 'manager' : lastStage === 'pending_exec' ? 'executive' : 'hr']
  return {
    firstStage: first,
    nextStages,
    recordAfterStage,
    managerUserId: stages.includes('pending_mgr') ? managerUserId : null,
    executiveUserId: stages.includes('pending_exec') ? executiveUserId : null,
    visibleInRecords: rule?.visibleInRecords ?? true,
  }
}

// ลำดับขั้นที่แสดงใน UI (ขั้นแรก → ขั้นสุดท้าย) ตามกฎหรือ flow เริ่มต้น
const stepsOf = (rule: Pick<FlowRuleRow, 'firstStage' | 'requireManagerStage' | 'requireExecutiveStage' | 'requireHrStage' | 'recordAfterStage'>) => {
  const stages: Array<'pending_mgr' | 'pending_exec' | 'pending_hr'> = []
  if (rule.requireManagerStage) stages.push('pending_mgr')
  if (rule.requireExecutiveStage) stages.push('pending_exec')
  if (rule.requireHrStage) stages.push('pending_hr')
  if (stages.length === 0) stages.push('pending_hr')
  let first: 'pending_mgr' | 'pending_exec' | 'pending_hr'
  if (rule.firstStage === 'default') first = stages[0]!
  else first = rule.firstStage
  if (!stages.includes(first)) first = stages[0]!
  return {
    stages: stages.slice(stages.indexOf(first)),
    recordAfterStage: rule.requireHrStage
      ? 'hr'
      : rule.recordAfterStage ?? (stages[stages.length - 1] === 'pending_mgr' ? 'manager' : stages[stages.length - 1] === 'pending_exec' ? 'executive' : 'hr'),
  }
}

async function loadFlowRule(conn: any, companyId: number, user: any, kind: Kind): Promise<FlowRuleRow | null> {
  const [rules] = await conn.query(
    `SELECT rule.id, rule.scope, rule.department_id, rule.role_id, rule.kind, rule.first_stage,
            rule.manager_user_id, rule.executive_user_id, rule.require_manager_stage, rule.require_executive_stage,
            rule.require_hr_stage, rule.record_after_stage, rule.visible_in_records
       FROM document_flow_rules rule
      WHERE rule.company_id = ? AND rule.is_active = 1 AND rule.kind IN (?, 'all')`,
    [companyId, kind],
  ) as [any[], unknown]
  if (!rules.length) return null

  const [targets] = await conn.query(
    `SELECT rule_id, scope, target_id FROM document_flow_rule_targets WHERE rule_id IN (?)`,
    [rules.map((rule: any) => Number(rule.id))],
  ) as [Array<{ rule_id: number; scope: 'department' | 'role'; target_id: number }>, unknown]

  const rows: FlowRuleRow[] = rules.map((rule: any) => {
    const own = targets.filter((t) => Number(t.rule_id) === Number(rule.id))
    // กฎเก่าที่ยังไม่มีแถวใน targets → ใช้ department_id / role_id เดียว
    const legacy = rule.scope === 'department' ? rule.department_id : rule.role_id
    const targetIds = own.filter((t) => t.scope === rule.scope).map((t) => Number(t.target_id))
    return flowRuleRow({
      ...rule,
      targetIds: targetIds.length ? targetIds : legacy !== null ? [Number(legacy)] : [],
      // role-filter มีเฉพาะกฎ scope=department (scope=role ใช้ role เป็น target หลักอยู่แล้ว)
      roleIds: rule.scope === 'department' ? own.filter((t) => t.scope === 'role').map((t) => Number(t.target_id)) : [],
    })
  })
  return matchFlowRule(rows, user, kind)
}

export async function flowRules(req: Request, res: Response) {
  needDocumentModule(req)
  const companyId = companyIdOf(req)
  const [rules] = await db.query<any[]>(
    `SELECT rule.id, rule.scope, rule.department_id, rule.role_id, rule.kind, rule.first_stage, rule.manager_user_id, rule.executive_user_id,
            rule.require_manager_stage, rule.require_executive_stage, rule.require_hr_stage, rule.record_after_stage, rule.visible_in_records, rule.is_active,
            manager.name AS manager_name, executive.name AS executive_name, role.name AS role_name, dep.name AS department_name,
            target.target_id AS target_id
       FROM document_flow_rules rule
       LEFT JOIN users manager ON manager.id = rule.manager_user_id
       LEFT JOIN users executive ON executive.id = rule.executive_user_id
       LEFT JOIN roles role ON role.id = rule.role_id
       LEFT JOIN departments dep ON dep.id = rule.department_id
       LEFT JOIN document_flow_rule_targets target
         ON target.rule_id = rule.id AND target.scope = rule.scope
      WHERE rule.company_id = ? ORDER BY rule.scope, rule.kind, rule.id, target.target_id`, [companyId],
  )
  // role-filter: บทบาทที่กฎจำกัด (เก็บเป็น scope='role' เมื่อกฎเป็น scope='department')
  const [roleFilterRows] = await db.query<any[]>(
    `SELECT rule_id, target_id FROM document_flow_rule_targets
      WHERE scope = 'role' AND rule_id IN (SELECT id FROM document_flow_rules WHERE company_id = ?)`,
    [companyId],
  )
  const roleFilters = new Map<number, number[]>()
  for (const row of roleFilterRows) {
    const list = roleFilters.get(Number(row.rule_id)) ?? []
    list.push(Number(row.target_id))
    roleFilters.set(Number(row.rule_id), list)
  }
  // รวมแถวที่ join กับ targets หลายแถวให้เหลือกฎเดียว + targetIds เป็น array
  const grouped: any[] = []
  const byId = new Map<number, any>()
  for (const row of rules) {
    const existing = byId.get(Number(row.id))
    if (existing) {
      if (row.target_id !== null) existing.targetIds.push(Number(row.target_id))
    } else {
      const entry = { ...row, targetIds: row.target_id === null ? [] : [Number(row.target_id)], roleIds: row.scope === 'department' ? (roleFilters.get(Number(row.id)) ?? []) : [] }
      delete entry.target_id
      byId.set(Number(row.id), entry)
      grouped.push(entry)
    }
  }
  const [departments] = await db.query<any[]>(
    `SELECT id, name, name = 'HR Div.' AS is_hr_department
       FROM departments WHERE company_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY name`, [companyId],
  )
  const [roles] = await db.query<any[]>(
    `SELECT id, name FROM roles WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name`,
  )
  const [approvers] = await db.query<any[]>(
    `SELECT u.id, u.name, r.name AS role_name, dep.name AS department_name
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN departments dep ON dep.id = u.department_id
      WHERE u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL
        AND r.name IN ('manager', 'executive', 'hr', 'admin') ORDER BY u.name`, [companyId],
  )
  res.json({
    rules: grouped.map(flowRuleRow).map((rule, index) => ({
      id: Number(grouped[index].id), isActive: Boolean(Number(grouped[index].is_active)), ...rule,
      managerName: grouped[index].manager_name ?? '', executiveName: grouped[index].executive_name ?? '',
      roleName: grouped[index].role_name ?? '', departmentName: grouped[index].department_name ?? '',
      steps: stepsOf(rule),
    })),
    departments: departments.map((row) => ({ id: Number(row.id), name: String(row.name), isHrDepartment: Boolean(Number(row.is_hr_department)) })),
    roles: roles.map((row) => ({ id: Number(row.id), name: String(row.name) })),
    approvers: approvers.map((row) => ({ id: Number(row.id), name: String(row.name), roleName: String(row.role_name), departmentName: String(row.department_name ?? '') })),
    defaultFlow: { ...FLOW_DEFAULT, steps: stepsOf({ firstStage: 'default', requireManagerStage: FLOW_DEFAULT.requireManagerStage, requireExecutiveStage: FLOW_DEFAULT.requireExecutiveStage, requireHrStage: FLOW_DEFAULT.requireHrStage, recordAfterStage: FLOW_DEFAULT.recordAfterStage }) },
  })
}

export async function updateFlowRules(req: Request, res: Response) {
  needDocumentModule(req)
  const companyId = companyIdOf(req)
  const roleName = String(req.user!.role?.name ?? '').trim().toLocaleLowerCase()
  if (roleName !== 'admin' && !(await isHrDivisionMember(req.user!.id, companyId))) {
    throw httpError(403, 'ไม่มีสิทธิ์กำหนดสิทธิ์การยื่นเอกสาร')
  }
  const incoming = req.body?.rules
  if (!Array.isArray(incoming)) throw httpError(400, 'ข้อมูลกฎ flow ไม่ถูกต้อง')
  for (const item of incoming) {
    if (!['department', 'role'].includes(String(item.scope))) throw httpError(400, 'scope ไม่ถูกต้อง')
    // รองรับหลายแผนก/หลายบทบาทในกฎเดียว: targetIds = array ของ id (รองรับ departmentId/roleId เดี่ยวด้วยเพื่อ backward compatible)
    const targetIds: number[] = Array.isArray(item.targetIds)
      ? item.targetIds.map((value: unknown) => Number(value))
      : [String(item.scope) === 'department' ? Number(item.departmentId) : Number(item.roleId)]
    if (targetIds.length === 0 || targetIds.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
      throw httpError(400, String(item.scope) === 'department' ? 'ต้องเลือกแผนก' : 'ต้องเลือกบทบาท')
    }
    item._targetIds = [...new Set(targetIds)]
    if (String(item.scope) === 'department') item.departmentId = item._targetIds[0]
    else item.roleId = item._targetIds[0]
    if (!FLOW_KINDS.includes(String(item.kind))) throw httpError(400, 'ประเภทเอกสารไม่ถูกต้อง')
    if (!['default', 'pending_mgr', 'pending_exec', 'pending_hr'].includes(String(item.firstStage))) throw httpError(400, 'ขั้นแรกไม่ถูกต้อง')
  }
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    // ลบทั้งหมดแล้วเขียนใหม่ (กฎต่อบริษัทไม่เยอะ — ง่ายและตรงกับ UI)
    await conn.execute(`DELETE FROM document_flow_rules WHERE company_id = ?`, [companyId])
    for (const item of incoming) {
      const managerId = item.managerUserId === null || item.managerUserId === '' ? null : Number(item.managerUserId)
      const executiveId = item.executiveUserId === null || item.executiveUserId === '' ? null : Number(item.executiveUserId)
      const [insertResult] = await conn.execute(
        `INSERT INTO document_flow_rules
           (company_id, scope, department_id, role_id, kind, first_stage, manager_user_id, executive_user_id,
            require_manager_stage, require_executive_stage, require_hr_stage, record_after_stage, visible_in_records, is_active, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyId, String(item.scope), String(item.scope) === 'department' ? Number(item.departmentId) : null,
          String(item.scope) === 'role' ? Number(item.roleId) : null, String(item.kind), String(item.firstStage),
          managerId, executiveId,
          item.requireManagerStage === false ? 0 : 1, item.requireExecutiveStage === true ? 1 : 0, item.requireHrStage === false ? 0 : 1,
          ['manager', 'executive', 'hr'].includes(String(item.recordAfterStage)) ? String(item.recordAfterStage) : null,
          item.visibleInRecords === false ? 0 : 1,
          item.isActive === false ? 0 : 1, req.user!.id],
      )
      const ruleId = Number((insertResult as { insertId: number }).insertId)
      // บันทึก targets หลัก (แผนกหลายตัว เมื่อ scope=department / บทบาทหลายตัว เมื่อ scope=role)
      if ((item._targetIds as number[]).length > 1) {
        await conn.execute(`UPDATE document_flow_rules SET department_id = NULL, role_id = NULL WHERE id = ?`, [ruleId])
      }
      for (const targetId of item._targetIds as number[]) {
        await conn.execute(
          `INSERT IGNORE INTO document_flow_rule_targets (rule_id, scope, target_id) VALUES (?, ?, ?)`,
          [ruleId, String(item.scope), targetId],
        )
      }
      // role-filter: บทบาทเพิ่มเติมที่กฎจำกัด (เฉพาะกฎ scope=department ที่ระบุ roleIds มา)
      const roleFilterIds: number[] = Array.isArray(item.roleIds)
        ? [...new Set((item.roleIds as unknown[]).map((value) => Number(value)).filter((value) => Number.isSafeInteger(value) && value > 0))] as number[]
        : []
      if (String(item.scope) === 'department') {
        for (const roleId of roleFilterIds) {
          await conn.execute(
            `INSERT IGNORE INTO document_flow_rule_targets (rule_id, scope, target_id) VALUES (?, 'role', ?)`,
            [ruleId, roleId],
          )
        }
      }
    }
    await conn.commit()
    await logActivity({
      userId: req.user!.id, module: 'documents', action: 'flow_rules_updated',
      entityType: 'document_flow_rules', entityId: null, details: { count: incoming.length }, ipAddress: req.ip,
    })
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  res.status(204).end()
}

function headerFields(kind: Kind, v: Values) {
  const s = (key: string) => nz(v[key])
  if (kind === 'leave' || kind === 'wfh') return { start: s('from'), end: s('to'), days: num(v.days), reason: s('reason') }
  if (kind === 'outing') return { start: s('from'), end: s('to'), days: null, reason: s('workDetails') }
  return { start: s('date'), end: s('date'), days: null, reason: s('reason') }
}

async function buildContext(kind: Kind, v: Values, user: any, policy: Policy, today: string): Promise<ValidationContext> {
  const ctx: ValidationContext = {
    policy, today, entitlement: { sick: Number(user.sick), personal: Number(user.personal), vacation: Number(user.vacation) },
    usedByBucket: {}, hasOverlap: false,
  }
  if (kind !== 'leave') return ctx
  const [typeRows] = await db.query<any[]>(`SELECT id, code, balance_bucket, allow_by_hour FROM leave_types WHERE code = ? AND is_active = 1 LIMIT 1`, [String(v.leaveType ?? '')])
  if (!typeRows[0]) throw httpError(400, 'ประเภทการลาไม่ถูกต้อง')
  ctx.leaveType = { id: typeRows[0].id, code: typeRows[0].code, balanceBucket: typeRows[0].balance_bucket, allowByHour: Boolean(typeRows[0].allow_by_hour) } satisfies LeaveTypeRow
  const [usage] = await db.query<any[]>(
    `SELECT balance_bucket, SUM(used_reserved) AS used FROM v_leave_usage
      WHERE employee_user_id = ? AND start_date BETWEEN ? AND ? GROUP BY balance_bucket`, [user.id, policy.yearStart, policy.yearEnd],
  )
  for (const row of usage) ctx.usedByBucket[row.balance_bucket] = Number(row.used)
  const from = String(v.from ?? ''), to = String(v.to ?? '')
  if (from && to && to >= from) {
    const [overlap] = await db.query<any[]>(
      `SELECT 1 FROM employee_requests WHERE employee_user_id = ? AND kind = 'leave' AND status IN ('pending_mgr','pending_hr','approved')
          AND start_date <= ? AND end_date >= ? LIMIT 1`, [user.id, to, from],
    )
    ctx.hasOverlap = overlap.length > 0
  }
  return ctx
}

const oneOf = (value: unknown, allowed: string[], message: string) => {
  if (!allowed.includes(String(value))) throw httpError(400, message)
  return String(value)
}

export async function store(req: Request, res: Response) {
  const uploadedCertificate = req.file
  const uploadedCertificateBytes = uploadedCertificate ? fs.readFileSync(uploadedCertificate.path) : Buffer.alloc(0)
  let certificateCommitted = false
  try {
  need(req, PERM.submit)
  const companyId = companyIdOf(req), me = req.user!.id, today = todayBangkok()
  const kind = req.body?.kind as Kind
  if (!KINDS.includes(kind)) throw httpError(400, 'ประเภทเอกสารไม่ถูกต้อง')
  let raw = req.body?.values
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { throw httpError(400, 'ข้อมูลเอกสารไม่ถูกต้อง') }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw httpError(400, 'ข้อมูลเอกสารไม่ถูกต้อง')
  if (uploadedCertificate && (kind !== 'leave' || String((raw as Values).leaveType ?? '') !== 'sick')) {
    throw httpError(400, 'แนบใบรับรองแพทย์ได้เฉพาะคำขอลาป่วย')
  }
  const valuesWithCertificate = { ...(raw as Values), cert: Boolean(uploadedCertificate) }
  if (uploadedCertificate) {
    const validFile = uploadedCertificate.mimetype === 'application/pdf'
      ? uploadedCertificateBytes.subarray(0, 5).toString('ascii') === '%PDF-'
      : uploadedCertificate.mimetype === 'image/png'
        ? uploadedCertificateBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : uploadedCertificate.mimetype === 'image/jpeg'
          && uploadedCertificateBytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    if (!validFile) throw httpError(400, 'รูปแบบไฟล์ใบรับรองแพทย์ไม่ถูกต้อง')
    if (path.basename(uploadedCertificate.originalname).length > 255) throw httpError(400, 'ชื่อไฟล์ยาวเกินไป')
  }
  // ยื่นเอกสาร: ลายเซ็นเป็น optional — กดยืนยันโดยไม่เซ็นก็ได้ (บันทึกเป็น NULL)
  const signature = checkSignature(req.body?.signature, false)

  const [userRows] = await db.query<any[]>(
    `SELECT u.id, u.name, u.department_id, u.role_id, r.name AS role_name, dep.name AS department_name, dep.name = 'HR Div.' AS isHrDept, e.manager_user_id,
            COALESCE(e.sick_leave_days, 0) AS sick, COALESCE(e.personal_leave_days, 0) AS personal, COALESCE(e.vacation_leave_days, 0) AS vacation
       FROM users u LEFT JOIN employees e ON e.user_id = u.id
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN departments dep ON dep.id = u.department_id
       WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [me],
  )
  const user = userRows[0]
  if (!user) throw httpError(404, 'User not found')

  const policy = await loadPolicy(companyId, today)
  const ctx = await buildContext(kind, valuesWithCertificate, user, policy, today)
  const { checks, values: v } = validateRequest(kind, valuesWithCertificate, ctx)
  const failed = checks.filter((check: { ok: any }) => !check.ok)
  if (failed.length) {
    if (uploadedCertificate) fs.rmSync(uploadedCertificate.path, { force: true })
    res.status(422).json({ message: 'ข้อมูลไม่ผ่านการตรวจสอบ', errors: failed.map((check) => ({ key: check.key, params: check.params })) })
    return
  }

  if (kind === 'ot') oneOf(v.dayType, ['weekday', 'weekend', 'holiday'], 'ประเภทวันไม่ถูกต้อง')
  if (kind === 'timefix') oneOf(v.cause, ['forgot', 'device', 'offsite', 'other'], 'สาเหตุไม่ถูกต้อง')

  const head = headerFields(kind, v)
  // หา manager ของผู้ยื่น: ใช้ employees.manager_user_id เป็นหลัก (fallback = manager คนแรกในแผนก)
  const deptManagerId = await findDeptManagerId(db as any, user.department_id, me, user.manager_user_id)
  // กำหนดสิทธิ์ในการยื่น: หากฎ flow ของแผนก/บทบาทผู้ยื่นก่อน (ถ้าไม่มีใช้ flow เริ่มต้นในโค้ด)
  const flowRule = await loadFlowRule(db as any, companyId, user, kind)
  const flow = computeFlow(flowRule, user, deptManagerId)
  const status = flow.firstStage
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      `INSERT INTO employee_request_sequences (company_id, prefix, policy_year, last_no) VALUES (?, ?, ?, LAST_INSERT_ID(1))
       ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)`, [companyId, PREFIX[kind], policy.year],
    )
    const [seq] = await conn.query<any[]>('SELECT LAST_INSERT_ID() AS n')
    const requestNo = `${PREFIX[kind]}-${policy.year}-${String(seq[0].n).padStart(4, '0')}`
    const [result] = await conn.execute<any>(
      `INSERT INTO employee_requests (company_id, request_no, kind, employee_user_id, department_id, manager_user_id, executive_user_id, policy_id, status, flow_json, start_date, end_date, days, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, requestNo, kind, me, user.department_id, flow.managerUserId, flow.executiveUserId, policy.id, status,
        JSON.stringify(flowSnapshotOf(flow)),
        head.start, head.end, head.days, head.reason],
    )
    const id = result.insertId as number
    const s = (key: string) => nz(v[key])
    if (kind === 'leave') {
      await conn.execute(
        `INSERT INTO employee_request_leave_details (request_id, leave_type_id, by_hour, start_time, end_time, hours, has_medical_certificate) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, ctx.leaveType!.id, ctx.leaveType!.allowByHour && v.byHour === true ? 1 : 0, s('start'), s('end'), num(v.hours), Boolean(uploadedCertificate) ? 1 : 0],
      )
      if (uploadedCertificate) {
        const fileHash = createHash('sha256').update(uploadedCertificateBytes).digest('hex')
        await conn.execute(
          `INSERT INTO employee_request_medical_certificates
            (request_id, stored_name, original_name, mime_type, file_size, file_hash, storage_path, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, path.basename(uploadedCertificate.filename), path.basename(uploadedCertificate.originalname),
            uploadedCertificate.mimetype, uploadedCertificate.size, fileHash, uploadedCertificate.path, me],
        )
      }
    } else if (kind === 'ot') {
      await conn.execute(`INSERT INTO employee_request_ot_details (request_id, day_type, work_date, start_time, end_time, hours, task) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, String(v.dayType), s('date'), s('start'), s('end'), num(v.hours), s('task')])
    } else if (kind === 'timefix') {
      await conn.execute(`INSERT INTO employee_request_timefix_details (request_id, fix_date, cause, in_time, out_time) VALUES (?, ?, ?, ?, ?)`,
        [id, s('date'), String(v.cause), s('inTime'), s('outTime')])
    } else if (kind === 'wfh') {
      await conn.execute(`INSERT INTO employee_request_wfh_details (request_id, place, plan) VALUES (?, ?, ?)`, [id, s('place'), s('plan')])
    } else if (kind === 'outing') {
      await conn.execute(
        `INSERT INTO employee_request_outing_details
          (request_id, outing_date, out_time, back_time, place, company_name, address, province, district,
           subdistrict, postal_code, country, latitude, longitude, project_name, customer_name,
           customer_position, phone, work_details, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, s('from'), s('outTime'), s('backTime'), s('address')?.slice(0, 255) ?? null, s('company'), s('address'),
          s('province'), s('district'), s('subdistrict'), s('postalCode'), s('country'), num(v.latitude),
          num(v.longitude), s('project'), s('customerName'), s('customerPosition'), s('phone'),
          s('workDetails'), s('remark')],
      )
    }
    const signatureFileId = signature ? await storeSignatureImage(conn, signature) : null
    await conn.execute(
      `INSERT INTO employee_request_signatures (request_id, stage, action, signer_user_id, signer_name, signature_file_id) VALUES (?, 'submitter', 'submitted', ?, ?, ?)`,
      [id, me, user.name, signatureFileId],
    )
    if ((req.body?.rememberSignature === true || req.body?.rememberSignature === 'true') && signatureFileId !== null) {
      await conn.execute(
        `INSERT INTO user_saved_signatures (user_id, signature_file_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_file_id = VALUES(signature_file_id)`, [me, signatureFileId],
      )
    }
    // แจ้งเตือนตามขั้นแรกของ flow: pending_mgr → manager ทุกคนในแผนก + manager ที่ผูกไว้
    const recipients = status === 'pending_mgr'
      ? [
          ...(await findDeptManagerIds(conn, companyId, user.department_id, me)),
          ...[flow.managerUserId].filter((userId): userId is number => Number.isSafeInteger(userId)),
        ]
      : status === 'pending_exec'
        ? (flow.executiveUserId ? [flow.executiveUserId] : await findExecUserIds(conn, companyId))
        : await findHrUserIds(conn, companyId, me)
    await notify(conn, recipients, id, 'submitted')
    await conn.commit()
    certificateCommitted = Boolean(uploadedCertificate)
    await logActivity({
      userId: me,
      module: 'documents',
      action: 'submitted',
      entityType: 'employee_request',
      entityId: id,
      details: { requestNo, kind, status },
      ipAddress: req.ip,
    })
    res.status(201).json({ id, requestNo, status })
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  } catch (error) {
    if (uploadedCertificate && !certificateCommitted) fs.rmSync(uploadedCertificate.path, { force: true })
    throw error
  }
}

export async function medicalCertificate(req: Request, res: Response) {
  needDocumentModule(req)
  const id = idParam(req), companyId = companyIdOf(req), me = req.user!.id
  const [rows] = await db.query<any[]>(
    `SELECT request.employee_user_id, certificate.storage_path, certificate.original_name, certificate.mime_type
       FROM employee_requests request
       JOIN employee_request_medical_certificates certificate ON certificate.request_id = request.id
      WHERE request.id = ? AND request.company_id = ? LIMIT 1`,
    [id, companyId],
  )
  const certificate = rows[0]
  if (!certificate) throw httpError(404, 'ไม่พบใบรับรองแพทย์')
  const roleName = String(req.user!.role?.name ?? '')
  if (!(await canViewMedicalCertificate(me, Number(certificate.employee_user_id), companyId, roleName))) {
    throw httpError(404, 'ไม่พบใบรับรองแพทย์')
  }
  const resolved = path.resolve(certificate.storage_path)
  if (!resolved.startsWith(`${medicalCertificateDirectory}${path.sep}`) || !fs.existsSync(resolved)) {
    throw httpError(404, 'ไม่พบไฟล์ใบรับรองแพทย์')
  }
  res.setHeader('Cache-Control', 'private, no-store')
  res.download(resolved, path.basename(certificate.original_name), (error) => {
    if (error && !res.headersSent) res.status(500).end()
  })
}

// ---------- อนุมัติ / ไม่อนุมัติ / ยกเลิก ----------
async function decide(req: Request, res: Response, action: 'approve' | 'reject') {
  needDocumentModule(req)
  const id = idParam(req), companyId = companyIdOf(req), me = req.user!.id, isHr = has(req, PERM.review)
  const note = nz(req.body?.note)
  if (action === 'reject' && !note) throw httpError(400, 'กรุณาระบุเหตุผลที่ไม่อนุมัติ')
  // อนุมัติไม่บังคับลายเซ็นแล้ว — ไม่เซ็นก็กดยืนยันได้ (ลายเซ็นเป็น optional)
  const signature = checkSignature(req.body?.signature, false)

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query<any[]>(`SELECT id, request_no, kind, employee_user_id, manager_user_id, department_id, status, flow_json FROM employee_requests WHERE id = ? AND company_id = ? FOR UPDATE`, [id, companyId])
    const row = rows[0]
    if (!row) throw httpError(404, 'Request not found')
    if (row.employee_user_id === me) throw httpError(403, 'ไม่สามารถพิจารณาเอกสารของตนเองได้')
    const myRole = String(req.user!.role?.name ?? '')
    const isExec = myRole === 'executive'
    const isAdmin = myRole === 'admin'
    // ขั้น HR: ทุกคนในแผนก HR Div. อนุมัติได้ (ยกเว้นผู้ยื่น) — ถ้าไม่มี HR คนอื่น admin fallback
    const otherHrIds = await findHrUserIds(conn, companyId, row.employee_user_id)
    const isAdminFallback = isAdmin && otherHrIds.length === 0
    let stage: 'manager' | 'executive' | 'hr'
    if (row.status === 'pending_mgr') {
      // manager ที่ผูกไว้ หรือ manager คนไหนก็ได้ในแผนกเดียวกับใบ
      const myDept = await myManagedDeptId(conn, req)
      const isDeptMgr = myDept !== null && Number(row.department_id) === myDept
      if (row.manager_user_id !== me && !isDeptMgr) throw httpError(403, 'ไม่มีสิทธิ์พิจารณาเอกสารนี้')
      stage = 'manager'
    }
    else if (row.status === 'pending_exec') { if (!isExec && !isAdmin) throw httpError(403, 'ไม่มีสิทธิ์พิจารณาเอกสารนี้'); stage = 'executive' }
    else if (row.status === 'pending_hr') { if (!isHr && !isAdminFallback) throw httpError(403, 'ไม่มีสิทธิ์พิจารณาเอกสารนี้'); stage = 'hr' }
    else throw httpError(409, 'เอกสารไม่อยู่ในสถานะรออนุมัติแล้ว')
    // ผู้ยื่นไม่มีสิทธิ์อนุมัติเอกสารของตัวเองแม้มีสิทธิ์ review (HR ยื่นต้องให้ HR คนอื่นเซ็น)
    if (!isAdminFallback && stage === 'hr') {
      const meIsHrMember = (await findHrUserIds(conn, companyId)).includes(me)
      if (!meIsHrMember) throw httpError(403, 'ไม่มีสิทธิ์พิจารณาเอกสารนี้')
    }

    // เอกสารที่ต้องผ่าน HR จะบันทึกหลัง HR อนุมัติเท่านั้น แม้ snapshot เก่าจะระบุขั้นก่อนหน้า
    let flowSnapshot: { manager: boolean; executive: boolean; hr: boolean; stages?: string[]; recordAfterStage?: string } | null = null
    flowSnapshot = parseFlowJson(row.flow_json)
    const requiresHr = !flowSnapshot || flowSnapshot.hr === true || flowSnapshot.stages?.includes('pending_hr') === true
    const isRecordStage = requiresHr ? stage === 'hr' : flowSnapshot?.recordAfterStage === stage
    const next = action === 'reject' ? 'rejected'
      : isRecordStage ? 'approved'
        : row.status === 'pending_mgr' && flowSnapshot?.executive === true ? 'pending_exec'
          : row.status !== 'pending_hr' && requiresHr ? 'pending_hr'
            : 'approved'
    const [update] = await conn.execute<any>(
      `UPDATE employee_requests SET status = ?, rejected_stage = ?, rejection_note = ?, decided_at = IF(? IN ('approved','rejected'), CURRENT_TIMESTAMP, NULL)
        WHERE id = ? AND status = ?`,
      [next, action === 'reject' ? stage : null, action === 'reject' ? note : null, next, id, row.status],
    )
    if (!update.affectedRows) throw httpError(409, 'เอกสารไม่อยู่ในสถานะรออนุมัติแล้ว')
    const [names] = await conn.query<any[]>(`SELECT name FROM users WHERE id = ? LIMIT 1`, [me])
    const signatureFileId = signature ? await storeSignatureImage(conn, signature) : null
    await conn.execute(
      `INSERT INTO employee_request_signatures (request_id, stage, action, signer_user_id, signer_name, signature_file_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, stage, action === 'approve' ? 'approved' : 'rejected', me, names[0]?.name ?? '', signatureFileId, note],
    )
    // จดจำลายเซ็นเฉพาะเมื่อมีลายเซ็นจริง (กดยืนยันโดยไม่เซ็น = ไม่บันทึก)
    if (action === 'approve' && req.body?.rememberSignature === true && signatureFileId !== null) {
      await conn.execute(
        `INSERT INTO user_saved_signatures (user_id, signature_file_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE signature_file_id = VALUES(signature_file_id)`, [me, signatureFileId],
      )
    }
    await notify(conn, [row.employee_user_id], id, next === 'approved' ? 'approved' : next === 'pending_hr' ? 'forwarded_to_hr' : 'forwarded_to_exec')
    if (next === 'pending_exec') {
      // ขั้น executive: แจ้งผู้ประกอบการที่กำหนดเอง (ถ้ามี) หรือทุกคนผู้ประกอบการ
      const execId = Number(row.executive_user_id ?? 0)
      await notify(conn, execId ? [execId] : await findExecUserIds(conn, companyId), id, 'submitted')
    }
    if (next === 'pending_hr') {
      // ขั้น HR: แจ้งทุกคนใน HR Div. (ยกเว้นผู้ยื่น) — ใครอนุมัติก็ได้; ถ้าไม่มี HR คนอื่น fallback executive/admin
      const hrRecipients = await findHrUserIds(conn, companyId, row.employee_user_id)
      await notify(conn, hrRecipients.length ? hrRecipients : await findExecUserIds(conn, companyId), id, 'submitted')
    }
    await conn.commit()
    await logActivity({
      userId: me,
      module: 'documents',
      action: action === 'approve' ? 'approved' : 'rejected',
      entityType: 'employee_request',
      entityId: id,
      details: { requestNo: row.request_no, kind: row.kind, status: next, stage },
      ipAddress: req.ip,
    })
    res.json({ id, status: next })
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}
export const approve = (req: Request, res: Response) => decide(req, res, 'approve')
export const reject = (req: Request, res: Response) => decide(req, res, 'reject')

export async function cancel(req: Request, res: Response) {
  needDocumentModule(req)
  const id = idParam(req)
  const companyId = companyIdOf(req)
  const [result] = await db.execute<any>(
    `UPDATE employee_requests SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ? AND employee_user_id = ?
        AND (status = 'pending_mgr' OR status = 'pending_exec' OR (status = 'pending_hr' AND manager_user_id IS NULL))`,
    [id, companyId, req.user!.id],
  )
  if (!result.affectedRows) throw httpError(409, 'ไม่สามารถยกเลิกเอกสารนี้ได้')
  const [rows] = await db.query<any[]>(
    `SELECT request_no, kind FROM employee_requests WHERE id = ? AND company_id = ? LIMIT 1`, [id, companyId],
  )
  await logActivity({
    userId: req.user!.id,
    module: 'documents',
    action: 'cancelled',
    entityType: 'employee_request',
    entityId: id,
    details: { requestNo: rows[0].request_no, kind: rows[0].kind, status: 'cancelled' },
    ipAddress: req.ip,
  })
  res.json({ id, status: 'cancelled' })
}

// ---------- Dry-run ตรวจเงื่อนไข (ให้ฟอร์มแสดง checklist สด) ----------
export async function validate(req: Request, res: Response) {
  need(req, PERM.submit)
  const companyId = companyIdOf(req), today = todayBangkok()
  const kind = req.body?.kind as Kind
  if (!KINDS.includes(kind)) throw httpError(400, 'ประเภทเอกสารไม่ถูกต้อง')
  const raw = req.body?.values
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw httpError(400, 'ข้อมูลเอกสารไม่ถูกต้อง')

  const [userRows] = await db.query<any[]>(
    `SELECT u.id, COALESCE(e.sick_leave_days, 0) AS sick,
            COALESCE(e.personal_leave_days, 0) AS personal,
            COALESCE(e.vacation_leave_days, 0) AS vacation
       FROM users u LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [req.user!.id],
  )
  const user = userRows[0]
  if (!user) throw httpError(404, 'User not found')

  const policy = await loadPolicy(companyId, today)
  const ctx = await buildContext(kind, raw as Values, user, policy, today)
  const result = validateRequest(kind, raw as Values, ctx)
  res.json(result)
}

// ---------- รายการ/ใบที่ใช้ร่วมกับการแจ้งเตือน ----------
const LIST_COLUMNS = `r.id, r.request_no, r.kind, r.status, r.days, r.reason, r.rejection_note, r.rejected_stage, r.submitted_at,
  DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
  r.employee_user_id, eu.name AS employee_name, dep.name AS department_name,
  lt.code AS leave_type, ot.hours AS ot_hours, ot.task AS ot_task, COALESCE(wfh.place, outing.place) AS place`
const LIST_JOINS = `JOIN users eu ON eu.id = r.employee_user_id
  LEFT JOIN departments dep ON dep.id = r.department_id
  LEFT JOIN employee_request_leave_details dl ON dl.request_id = r.id
  LEFT JOIN leave_types lt ON lt.id = dl.leave_type_id
  LEFT JOIN employee_request_ot_details ot ON ot.request_id = r.id
  LEFT JOIN employee_request_wfh_details wfh ON wfh.request_id = r.id
  LEFT JOIN employee_request_outing_details outing ON outing.request_id = r.id`
const listRow = (row: any) => ({ ...camelize(row), days: row.days === null ? null : Number(row.days), otHours: row.ot_hours === null ? null : Number(row.ot_hours) })

export async function notifications(req: Request, res: Response) {
  needDocumentModule(req)
  const [rows] = await db.query<any[]>(
    `SELECT n.id AS notification_id, n.event, n.is_read, n.created_at, ${LIST_COLUMNS}
       FROM employee_request_notifications n
       JOIN employee_requests r ON r.id = n.request_id
       ${LIST_JOINS}
      WHERE n.recipient_user_id = ? AND r.company_id = ?
      ORDER BY n.created_at DESC, n.id DESC LIMIT 200`, [req.user!.id, companyIdOf(req)],
  )
  res.json(rows.map((row) => ({ ...listRow(row), isRead: Boolean(row.is_read) })))
}

export async function readNotifications(req: Request, res: Response) {
  needDocumentModule(req)
  const id = req.body?.id === undefined ? null : Number(req.body.id)
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) throw httpError(400, 'Invalid notification id')
  await db.execute(
    `UPDATE employee_request_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE recipient_user_id = ? AND is_read = 0 ${id === null ? '' : 'AND id = ?'}`, id === null ? [req.user!.id] : [req.user!.id, id],
  )
  res.status(204).end()
}

// ---------- badge (sidebar): เอกสารรอตนเซ็น + แจ้งเตือนยังไม่อ่าน ----------
export async function badges(req: Request, res: Response) {
  needDocumentModule(req)
  const companyId = companyIdOf(req), me = req.user!.id
  const myRole = String(req.user!.role?.name ?? '')
  const isExec = myRole === 'executive', isAdmin = myRole === 'admin'
  const isHrBadge = has(req, PERM.review) && (await findHrUserIds(db as any, companyId)).includes(me)
  const myDept = await myManagedDeptId(db as any, req)
  // รอนุมัติ: ตามขั้นตอนของแต่ละ role — manager ตาม snapshot หรือแผนกที่ดูแล, executive/admin ขั้น exec, HR Div. ขั้น HR (ไม่รวมเอกสารของตนเอง)
  // status คือขั้นปัจจุบันที่ compute จาก flow snapshot แล้ว จึงไม่ต้องอ่าน JSON ใน SQL
  // (ฐาน production ใช้ MySQL 5.6 ซึ่งไม่มี JSON_EXTRACT)
  const [pendingRows] = await db.query<any[]>(
    `SELECT COUNT(*) AS n FROM employee_requests r
      WHERE r.company_id = ? AND r.employee_user_id <> ?
        AND ((r.status = 'pending_mgr' AND (r.manager_user_id = ? OR r.department_id = ?))
          ${isExec || isAdmin ? `OR r.status = 'pending_exec'` : ''}
          ${isHrBadge ? `OR r.status = 'pending_hr'` : ''})`,
    [companyId, me, me, myDept ?? -1],
  )
  const [unreadRows] = await db.query<any[]>(
    `SELECT COUNT(*) AS n FROM employee_request_notifications n
       JOIN employee_requests r ON r.id = n.request_id
      WHERE n.recipient_user_id = ? AND r.company_id = ? AND n.is_read = 0`, [me, companyId],
  )
  res.json({ pendingApproval: Number(pendingRows[0]?.n ?? 0), unreadNotifications: Number(unreadRows[0]?.n ?? 0) })
}

// ---------- สรุปสำหรับ dashboard (เอกสารของตัวเอง + โควตาลาคงเหลือ) ----------
export async function dashboardSummary(req: Request, res: Response) {
  needDocumentModule(req)
  const companyId = companyIdOf(req), me = req.user!.id, today = todayBangkok()
  const [policyRowData] = await db.query<any[]>(
    `${POLICY_SELECT} WHERE company_id = ? AND is_active = 1
      ORDER BY (year_start <= ? AND year_end >= ?) DESC, policy_year DESC LIMIT 1`, [companyId, today, today],
  )
  const policy = policyRowData[0] ? policyRow(policyRowData[0]) : null
  const [stats] = await db.query<any[]>(
    `SELECT COUNT(*) AS total,
            SUM(status IN ('pending_mgr','pending_exec','pending_hr')) AS pending,
            SUM(status = 'approved') AS approved,
            SUM(status = 'rejected') AS rejected
       FROM employee_requests WHERE company_id = ? AND employee_user_id = ? AND status <> 'cancelled'`, [companyId, me],
  )
  const balances: Array<{ id: string; title: string; total: number; used: number; pending: number; remaining: number }> = []
  if (policy) {
    const [entRow] = await db.query<any[]>(
      `SELECT COALESCE(e.sick_leave_days, 0) AS sick, COALESCE(e.personal_leave_days, 0) AS personal, COALESCE(e.vacation_leave_days, 0) AS vacation
         FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [me],
    )
    const entitlement = { sick: Number(entRow[0]?.sick ?? 0), personal: Number(entRow[0]?.personal ?? 0), vacation: Number(entRow[0]?.vacation ?? 0) }
    const [usage] = await db.query<any[]>(
      `SELECT lt.balance_bucket,
              SUM(CASE WHEN r.status = 'approved' THEN COALESCE(r.days, 0) ELSE 0 END) AS used,
              SUM(CASE WHEN r.status IN ('pending_mgr','pending_exec','pending_hr') THEN COALESCE(r.days, 0) ELSE 0 END) AS pending
         FROM employee_requests r
         JOIN employee_request_leave_details dl ON dl.request_id = r.id
         JOIN leave_types lt ON lt.id = dl.leave_type_id
        WHERE r.employee_user_id = ? AND r.kind = 'leave' AND r.status <> 'cancelled' AND r.start_date BETWEEN ? AND ?
        GROUP BY lt.balance_bucket`, [me, policy.yearStart, policy.yearEnd],
    )
    const byBucket: Record<string, { used: number; pending: number }> = {}
    for (const row of usage) byBucket[String(row.balance_bucket)] = { used: Number(row.used), pending: Number(row.pending) }
    const labelTh = { sick: 'ลาป่วย', personal: 'ลากิจ', vacation: 'ลาพักร้อน' } as Record<string, string>
    for (const bucket of ['sick', 'personal', 'vacation'] as const) {
      const total = entitlement[bucket]
      const used = byBucket[bucket]?.used ?? 0, pending = byBucket[bucket]?.pending ?? 0
      balances.push({ id: bucket, title: labelTh[bucket] ? `${labelTh[bucket]}คงเหลือ` : bucket, total, used, pending, remaining: Math.max(0, total - used - pending) })
    }
  }
  res.json({
    stats: {
      total: Number(stats[0]?.total ?? 0), pending: Number(stats[0]?.pending ?? 0),
      approved: Number(stats[0]?.approved ?? 0), rejected: Number(stats[0]?.rejected ?? 0),
    },
    balances,
    recent: [],
  })
}

// ---------- รายชื่อพนักงาน + โควตาลา (หน้า ledger) ----------
// มองเห็น: admin/HR เห็นทั้งบริษัท · ผู้จัดการเห็นลูกน้องในแผนกตัวเอง · คนอื่นเห็นตัวเอง
export async function people(req: Request, res: Response) {
  needDocumentModule(req)
  const me = req.user!.id
  // HR = มีสิทธิ์พิจารณา + อยู่แผนก HR Div.
  const isHr = has(req, PERM.review) && String((req.user as any)?.department ?? '').trim().toLowerCase() === 'hr div.'
  const myRole = String(req.user!.role?.name ?? '')
  const seeAll = isHr || myRole === 'admin'
  const isManager = myRole === 'manager'
  const [rows] = await db.query<any[]>(
    `SELECT u.id, u.name, u.email, u.is_active, dep.name AS department_name, e.employee_code, e.position,
            e.email_notifications_enabled, mgr.name AS manager_name,
            COALESCE(e.sick_leave_days, 0) AS sick, COALESCE(e.personal_leave_days, 0) AS personal,
            COALESCE(e.vacation_leave_days, 0) AS vacation, COALESCE(e.other_leave_days, 0) AS other,
            DATE_FORMAT(e.employment_start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(e.appointed_date,'%Y-%m-%d') AS appointed_date
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN users mgr ON mgr.id = e.manager_user_id
       LEFT JOIN departments dep ON dep.id = u.department_id
      WHERE u.deleted_at IS NULL AND u.company_id = ?
        AND ${seeAll
          ? '1 = 1'
          : isManager
            ? '(u.id = ? OR e.manager_user_id = ? OR u.department_id = (SELECT department_id FROM users me WHERE me.id = ?))'
            : 'u.id = ?'}
      ORDER BY u.name`, seeAll || !isManager ? [companyIdOf(req), me] : [companyIdOf(req), me, me, me],
  )
  res.json(rows.map((row) => ({
    ...camelize(row), isActive: Boolean(row.is_active),
    emailNotificationsEnabled: row.email_notifications_enabled === null ? null : Boolean(row.email_notifications_enabled),
    sick: Number(row.sick), personal: Number(row.personal), vacation: Number(row.vacation), other: Number(row.other),
  })))
}

export async function outingReport(req: Request, res: Response) {
  needDocumentModule(req)
  const companyId = companyIdOf(req), me = req.user!.id
  const roleName = String(req.user!.role?.name ?? '').trim().toLowerCase()
  const departmentName = String(req.user!.department ?? '').trim().toLowerCase()
  const canSelectEmployee = roleName === 'admin' || departmentName === 'hr div.'
  const from = String(req.query.from ?? '')
  const to = String(req.query.to ?? '')
  const isDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  if (!isDate(from) || !isDate(to) || from > to) throw httpError(400, 'ช่วงวันที่รายงานไม่ถูกต้อง')

  const requestedEmployeeId = req.query.employeeId === undefined ? me : Number(req.query.employeeId)
  if (!Number.isSafeInteger(requestedEmployeeId) || requestedEmployeeId < 1) throw httpError(400, 'รหัสพนักงานไม่ถูกต้อง')
  if (!canSelectEmployee && requestedEmployeeId !== me) {
    const [relatedRows] = await db.query<any[]>(
      `SELECT 1
         FROM employee_requests related
         JOIN employee_request_signatures signature
           ON signature.request_id = related.id AND signature.signer_user_id = ? AND signature.action = 'approved'
        WHERE related.company_id = ? AND related.employee_user_id = ?
          AND related.kind IN ('outing', 'wfh') AND related.status = 'approved'
        LIMIT 1`,
      [me, companyId, requestedEmployeeId],
    )
    if (!relatedRows.length) throw httpError(403, 'ไม่มีสิทธิ์ดูรายงานของพนักงานคนนี้')
  }
  const relatedRequestsOnly = !canSelectEmployee && requestedEmployeeId !== me
    ? `AND EXISTS (
         SELECT 1 FROM employee_request_signatures related
          WHERE related.request_id = r.id AND related.signer_user_id = ? AND related.action = 'approved'
       )`
    : ''
  const relatedRequestParams = relatedRequestsOnly ? [me] : []

  const [outingRows] = await db.query<any[]>(
    `SELECT 'outing' AS report_kind, r.id, r.request_no, r.status,
            DATE_FORMAT(COALESCE(r.start_date, o.outing_date), '%Y-%m-%d') AS from_date,
            DATE_FORMAT(COALESCE(r.end_date, o.outing_date), '%Y-%m-%d') AS to_date,
            TIME_FORMAT(o.out_time, '%H:%i') AS out_time, TIME_FORMAT(o.back_time, '%H:%i') AS back_time,
            u.name AS employee_name, o.company_name, o.address, o.province, o.district, o.subdistrict,
            o.postal_code, o.country, o.latitude, o.longitude, o.project_name, o.customer_name,
            o.customer_position, o.phone, o.work_details, o.remark,
            submitter_image.signature_image AS submitter_signature_image,
            approved.signer_name AS approved_by, approved_image.signature_image AS approved_signature_image
       FROM employee_requests r
       JOIN employee_request_outing_details o ON o.request_id = r.id
       JOIN users u ON u.id = r.employee_user_id
       LEFT JOIN employee_request_signatures submitter
         ON submitter.request_id = r.id AND submitter.stage = 'submitter' AND submitter.action = 'submitted'
       LEFT JOIN employee_request_signatures approved
         ON approved.id = (
           SELECT latest.id FROM employee_request_signatures latest
            WHERE latest.request_id = r.id AND latest.action = 'approved'
            ORDER BY latest.signed_at DESC, latest.id DESC LIMIT 1
         )
       LEFT JOIN signature_images submitter_image ON submitter_image.id = submitter.signature_file_id
       LEFT JOIN signature_images approved_image ON approved_image.id = approved.signature_file_id
      WHERE r.company_id = ? AND r.kind = 'outing' AND r.status = 'approved'
         AND r.employee_user_id = ? ${relatedRequestsOnly} AND COALESCE(r.start_date, o.outing_date) <= ?
        AND COALESCE(r.end_date, o.outing_date) >= ?
      ORDER BY COALESCE(r.start_date, o.outing_date), o.out_time, r.id`,
    [companyId, requestedEmployeeId, ...relatedRequestParams, to, from],
  )
  const [wfhRows] = await db.query<any[]>(
    `SELECT 'wfh' AS report_kind, r.id, r.request_no,
            DATE_FORMAT(r.start_date, '%Y-%m-%d') AS from_date,
            DATE_FORMAT(r.end_date, '%Y-%m-%d') AS to_date, r.reason,
            u.name AS employee_name, wfh.place, wfh.plan,
            submitter_image.signature_image AS submitter_signature_image,
            approved.signer_name AS approved_by, approved_image.signature_image AS approved_signature_image
       FROM employee_requests r
       JOIN employee_request_wfh_details wfh ON wfh.request_id = r.id
       JOIN users u ON u.id = r.employee_user_id
       LEFT JOIN employee_request_signatures submitter
         ON submitter.request_id = r.id AND submitter.stage = 'submitter' AND submitter.action = 'submitted'
       LEFT JOIN employee_request_signatures approved
         ON approved.id = (
           SELECT latest.id FROM employee_request_signatures latest
            WHERE latest.request_id = r.id AND latest.action = 'approved'
            ORDER BY latest.signed_at DESC, latest.id DESC LIMIT 1
         )
       LEFT JOIN signature_images submitter_image ON submitter_image.id = submitter.signature_file_id
       LEFT JOIN signature_images approved_image ON approved_image.id = approved.signature_file_id
      WHERE r.company_id = ? AND r.kind = 'wfh' AND r.status = 'approved'
         AND r.employee_user_id = ? ${relatedRequestsOnly} AND r.start_date <= ? AND r.end_date >= ?
      ORDER BY r.start_date, r.id`,
    [companyId, requestedEmployeeId, ...relatedRequestParams, to, from],
  )
  const wfhReportRows = wfhRows.map((row) => ({
    ...row,
    address: row.place,
    company_name: null,
    province: null,
    district: null,
    subdistrict: null,
    postal_code: null,
    country: null,
    project_name: null,
    customer_name: null,
    customer_position: null,
    phone: null,
    out_time: null,
    back_time: null,
    work_details: row.plan,
    remark: row.reason,
  }))
  const rows = [...outingRows, ...wfhReportRows].sort((a, b) =>
    String(a.from_date).localeCompare(String(b.from_date))
    || String(a.out_time ?? '').localeCompare(String(b.out_time ?? ''))
    || Number(a.id) - Number(b.id),
  )
  const [signatureRows] = await db.query<any[]>(
    `SELECT image.signature_image FROM user_saved_signatures saved
       JOIN signature_images image ON image.id = saved.signature_file_id
       JOIN users u ON u.id = saved.user_id AND u.company_id = ? AND u.deleted_at IS NULL
      WHERE saved.user_id = ? LIMIT 1`, [companyId, requestedEmployeeId],
  )
  const [pendingRows] = await db.query<any[]>(
    `SELECT COUNT(*) AS total FROM employee_requests r
       LEFT JOIN employee_request_outing_details o ON o.request_id = r.id
      WHERE r.company_id = ? AND r.kind IN ('outing', 'wfh')
        AND r.status IN ('pending_mgr','pending_exec','pending_hr')
        AND r.employee_user_id = ? ${relatedRequestsOnly}
        AND ((r.kind = 'outing' AND COALESCE(r.start_date, o.outing_date) <= ? AND COALESCE(r.end_date, o.outing_date) >= ?)
          OR (r.kind = 'wfh' AND r.start_date <= ? AND r.end_date >= ?))`,
    [companyId, requestedEmployeeId, ...relatedRequestParams, to, from, to, from],
  )
  let employees: Array<{ id: number; name: string; department: string | null }> = []
  if (canSelectEmployee) {
    const [peopleRows] = await db.query<any[]>(
      `SELECT u.id, u.name, departments.name AS department
         FROM users u
         LEFT JOIN departments ON departments.id = u.department_id
        WHERE u.company_id = ? AND u.deleted_at IS NULL AND u.is_active = 1
        ORDER BY u.name`,
      [companyId],
    )
    employees = peopleRows
  } else {
    const [peopleRows] = await db.query<any[]>(
      `SELECT DISTINCT u.id, u.name, departments.name AS department
         FROM users u
         LEFT JOIN departments ON departments.id = u.department_id
        WHERE u.company_id = ? AND u.deleted_at IS NULL AND u.is_active = 1
          AND (u.id = ? OR EXISTS (
            SELECT 1
              FROM employee_requests related
              JOIN employee_request_signatures signature
                ON signature.request_id = related.id AND signature.signer_user_id = ? AND signature.action = 'approved'
             WHERE related.company_id = u.company_id AND related.employee_user_id = u.id
               AND related.kind IN ('outing', 'wfh') AND related.status = 'approved'
          ))
        ORDER BY u.name`,
      [companyId, me, me],
    )
    employees = peopleRows
  }
  res.json({
    data: rows.map((row) => camelize(row)),
    pendingCount: Number(pendingRows[0]?.total ?? 0),
    employees,
    submitterSignature: signatureRows[0]?.signature_image ?? null,
  })
}
