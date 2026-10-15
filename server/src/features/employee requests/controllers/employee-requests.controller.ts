import type { Request, Response } from 'express'
import { db } from '../../../config/database.js'
import { httpError } from '../../../middleware/errors.js'
import { validateRequest, type Kind, type LeaveTypeRow, type Policy, type ValidationContext, type Values } from '../services/employee-requests.validation.js'

// ใช้สิทธิ์เดิมของโมดูลเอกสาร + เพิ่ม 'จัดการนโยบายการลา' 1 รายการ (ต้อง seed ในตาราง permissions)
const PERM = { access: 'เข้าถึงเมนูเอกสาร', submit: 'ยื่นเอกสาร', review: 'พิจารณาเอกสาร', policy: 'จัดการนโยบายการลา' }
const KINDS: Kind[] = ['leave', 'ot', 'timefix', 'wfh', 'outing', 'swap']
const PREFIX: Record<Kind, string> = { leave: 'LV', ot: 'OT', timefix: 'TF', wfh: 'WFH', outing: 'OUT', swap: 'SW' }
const STATUSES = ['pending_mgr', 'pending_hr', 'approved', 'rejected', 'cancelled']
const MAX_SIGNATURE_LENGTH = 200_000

const has = (req: Request, name: string) => Boolean(req.user?.permissions.some((permission) => permission.name === name))
const need = (req: Request, name: string) => { if (!has(req, name)) throw httpError(403, 'ไม่มีสิทธิ์ดำเนินการกับเอกสาร') }
// req.user มี company ในรูป { id, name, logoUrl } ตาม require-auth.middleware.ts
const companyIdOf = (req: Request) => {
  const raw = (req.user as any)?.company?.id ?? (req.user as any)?.companyId
  const id = Number(raw)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(403, 'ไม่พบริษัทของผู้ใช้')
  return id
}
const todayBangkok = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
const idParam = (req: Request) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, 'Invalid request id')
  return id
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
  need(req, PERM.access)
  res.json(await loadPolicy(companyIdOf(req), todayBangkok()))
}

export async function updatePolicy(req: Request, res: Response) {
  need(req, PERM.policy)
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
  res.json(policyRow(rows[0]))
}

// ---------- ลายเซ็นที่จดจำไว้ ----------
export async function mySignature(req: Request, res: Response) {
  need(req, PERM.access)
  const [rows] = await db.query<any[]>(`SELECT signature_image FROM user_saved_signatures WHERE user_id = ? LIMIT 1`, [req.user!.id])
  res.json({ signature: rows[0]?.signature_image ?? '' })
}
export async function saveMySignature(req: Request, res: Response) {
  need(req, PERM.access)
  const image = checkSignature(req.body?.signature, true)
  await db.execute(
    `INSERT INTO user_saved_signatures (user_id, signature_image) VALUES (?, ?) ON DUPLICATE KEY UPDATE signature_image = VALUES(signature_image)`,
    [req.user!.id, image],
  )
  res.status(204).end()
}

// ---------- รายการ / รายละเอียด ----------
export async function index(req: Request, res: Response) {
  need(req, PERM.access)
  const companyId = companyIdOf(req), me = req.user!.id, isHr = has(req, PERM.review)
  const status = String(req.query.status ?? 'all'), kind = String(req.query.kind ?? 'all'), awaitingMe = req.query.awaiting === 'me'
  if (status !== 'all' && status !== 'pending' && !STATUSES.includes(status)) throw httpError(400, 'Invalid status')
  if (!['all', 'leave', 'ot', 'other', ...KINDS].includes(kind)) throw httpError(400, 'Invalid kind')

  const where = ['r.company_id = ?'], params: any[] = [companyId]
  if (!isHr) { where.push('(r.employee_user_id = ? OR r.manager_user_id = ?)'); params.push(me, me) }
  if (status === 'pending') where.push(`r.status IN ('pending_mgr','pending_hr')`)
  else if (status !== 'all') { where.push('r.status = ?'); params.push(status) }
  const employeeId = req.query.employeeId === undefined ? null : Number(req.query.employeeId)
  if (employeeId !== null) {
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) throw httpError(400, 'Invalid employee id')
    where.push('r.employee_user_id = ?'); params.push(employeeId)
  }
  if (kind === 'other') where.push(`r.kind IN ('timefix','wfh','outing','swap')`)
  else if (kind !== 'all') { where.push('r.kind = ?'); params.push(kind) }
  if (awaitingMe) {
    where.push(`r.employee_user_id <> ? AND ((r.status = 'pending_mgr' AND r.manager_user_id = ?) ${isHr ? `OR r.status = 'pending_hr'` : ''})`)
    params.push(me, me)
  }
  const [rows] = await db.query<any[]>(
    `SELECT r.id, r.request_no, r.kind, r.status, r.days, r.reason, r.rejection_note, r.rejected_stage, r.submitted_at,
            DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
            r.employee_user_id, eu.name AS employee_name, dep.name AS department_name,
            lt.code AS leave_type, ot.hours AS ot_hours, ot.task AS ot_task,
            COALESCE(wfh.place, outing.place) AS place
       FROM employee_requests r
       JOIN users eu ON eu.id = r.employee_user_id
       LEFT JOIN departments dep ON dep.id = r.department_id
       LEFT JOIN employee_request_leave_details dl ON dl.request_id = r.id
       LEFT JOIN leave_types lt ON lt.id = dl.leave_type_id
       LEFT JOIN employee_request_ot_details ot ON ot.request_id = r.id
       LEFT JOIN employee_request_wfh_details wfh ON wfh.request_id = r.id
       LEFT JOIN employee_request_outing_details outing ON outing.request_id = r.id
      WHERE ${where.join(' AND ')}
      ORDER BY r.submitted_at DESC, r.id DESC LIMIT 1000`, params,
  )
  res.json(rows.map((row) => ({ ...camelize(row), days: row.days === null ? null : Number(row.days), otHours: row.ot_hours === null ? null : Number(row.ot_hours) })))
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
                  TIME_FORMAT(back_time,'%H:%i') AS back_time, place FROM employee_request_outing_details WHERE request_id = ?`,
  swap: `SELECT DATE_FORMAT(off_date,'%Y-%m-%d') AS off_date, DATE_FORMAT(work_date,'%Y-%m-%d') AS work_date FROM employee_request_swap_details WHERE request_id = ?`,
}

export async function show(req: Request, res: Response) {
  need(req, PERM.access)
  const id = idParam(req), companyId = companyIdOf(req), me = req.user!.id, isHr = has(req, PERM.review)
  const [rows] = await db.query<any[]>(
    `SELECT r.id, r.request_no, r.kind, r.status, r.days, r.reason, r.rejection_note, r.rejected_stage, r.submitted_at, r.decided_at,
            DATE_FORMAT(r.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(r.end_date,'%Y-%m-%d') AS end_date,
            r.employee_user_id, r.manager_user_id, eu.name AS employee_name, dep.name AS department_name
       FROM employee_requests r JOIN users eu ON eu.id = r.employee_user_id LEFT JOIN departments dep ON dep.id = r.department_id
      WHERE r.id = ? AND r.company_id = ? LIMIT 1`, [id, companyId],
  )
  const row = rows[0]
  if (!row || !(isHr || row.employee_user_id === me || row.manager_user_id === me)) throw httpError(404, 'Request not found')
  const detailSql = DETAIL_SQL[row.kind as Kind]
  if (!detailSql) throw httpError(404, 'Request not found')
  const [detailRows] = await db.query<any[]>(detailSql, [id])
  const detail = detailRows[0] ? camelize(detailRows[0]) as any : null
  if (detail && row.kind === 'leave') { detail.byHour = Boolean(detail.byHour); detail.hasMedicalCertificate = Boolean(detail.hasMedicalCertificate) }
  const [signatures] = await db.query<any[]>(
    `SELECT stage, action, signer_name, signature_image, note, signed_at FROM employee_request_signatures WHERE request_id = ? ORDER BY signed_at, id`, [id],
  )
  const notSelf = row.employee_user_id !== me
  const { manager_user_id: _manager, ...publicRow } = row
  res.json({
    ...camelize(publicRow), days: row.days === null ? null : Number(row.days), detail, signatures: signatures.map(camelize),
    canApprove: notSelf && ((row.status === 'pending_mgr' && row.manager_user_id === me) || (row.status === 'pending_hr' && isHr)),
    canCancel: !notSelf && (row.status === 'pending_mgr' || (row.status === 'pending_hr' && row.manager_user_id === null)),
  })
}

// ---------- ยื่นเอกสาร ----------
const notify = async (conn: any, userIds: number[], requestId: number, event: string) => {
  const ids = [...new Set(userIds)]
  if (!ids.length) return
  await conn.query(`INSERT INTO employee_request_notifications (recipient_user_id, request_id, event) VALUES ?`, [ids.map((userId) => [userId, requestId, event])])
}
// ผู้ใช้ที่มีสิทธิ์ 'พิจารณาเอกสาร' ของบริษัทนี้ (ยกเว้นตัวเอกสารเอง กรณีเทียบเทียบภายหลัง)
const findHrUserIds = async (conn: any, companyId: number): Promise<number[]> => {
  const [rows] = await conn.query(
    `SELECT DISTINCT u.id FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id AND p.is_active = 1 AND p.deleted_at IS NULL
      WHERE u.company_id = ? AND u.is_active = 1 AND u.deleted_at IS NULL
        AND p.name = ?`, [companyId, PERM.review],
  )
  return (rows as any[]).map((row: any) => Number(row.id))
}

function headerFields(kind: Kind, v: Values) {
  const s = (key: string) => nz(v[key])
  if (kind === 'leave' || kind === 'wfh') return { start: s('from'), end: s('to'), days: num(v.days), reason: s('reason') }
  if (kind === 'swap') return { start: s('offDate'), end: s('offDate'), days: null, reason: s('reason') }
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
  need(req, PERM.submit)
  const companyId = companyIdOf(req), me = req.user!.id, today = todayBangkok()
  const kind = req.body?.kind as Kind
  if (!KINDS.includes(kind)) throw httpError(400, 'ประเภทเอกสารไม่ถูกต้อง')
  const raw = req.body?.values
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw httpError(400, 'ข้อมูลเอกสารไม่ถูกต้อง')
  const signature = checkSignature(req.body?.signature, true)

  const [userRows] = await db.query<any[]>(
    `SELECT u.id, u.name, u.department_id, e.manager_user_id,
            COALESCE(e.sick_leave_days, 0) AS sick, COALESCE(e.personal_leave_days, 0) AS personal, COALESCE(e.vacation_leave_days, 0) AS vacation
       FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [me],
  )
  const user = userRows[0]
  if (!user) throw httpError(404, 'User not found')

  const policy = await loadPolicy(companyId, today)
  const ctx = await buildContext(kind, raw as Values, user, policy, today)
  const { checks, values: v } = validateRequest(kind, raw as Values, ctx)
  const failed = checks.filter((check: { ok: any }) => !check.ok)
  if (failed.length) { res.status(422).json({ message: 'ข้อมูลไม่ผ่านการตรวจสอบ', errors: failed.map((check) => ({ key: check.key, params: check.params })) }); return }

  if (kind === 'ot') oneOf(v.dayType, ['weekday', 'weekend', 'holiday'], 'ประเภทวันไม่ถูกต้อง')
  if (kind === 'timefix') oneOf(v.cause, ['forgot', 'device', 'offsite', 'other'], 'สาเหตุไม่ถูกต้อง')

  const head = headerFields(kind, v)
  const status = user.manager_user_id ? 'pending_mgr' : 'pending_hr'
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
      `INSERT INTO employee_requests (company_id, request_no, kind, employee_user_id, department_id, manager_user_id, policy_id, status, start_date, end_date, days, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, requestNo, kind, me, user.department_id, user.manager_user_id, policy.id, status, head.start, head.end, head.days, head.reason],
    )
    const id = result.insertId as number
    const s = (key: string) => nz(v[key])
    if (kind === 'leave') {
      await conn.execute(
        `INSERT INTO employee_request_leave_details (request_id, leave_type_id, by_hour, start_time, end_time, hours, has_medical_certificate) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, ctx.leaveType!.id, ctx.leaveType!.allowByHour && v.byHour === true ? 1 : 0, s('start'), s('end'), num(v.hours), v.cert === true ? 1 : 0],
      )
    } else if (kind === 'ot') {
      await conn.execute(`INSERT INTO employee_request_ot_details (request_id, day_type, work_date, start_time, end_time, hours, task) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, String(v.dayType), s('date'), s('start'), s('end'), num(v.hours), s('task')])
    } else if (kind === 'timefix') {
      await conn.execute(`INSERT INTO employee_request_timefix_details (request_id, fix_date, cause, in_time, out_time) VALUES (?, ?, ?, ?, ?)`,
        [id, s('date'), String(v.cause), s('inTime'), s('outTime')])
    } else if (kind === 'wfh') {
      await conn.execute(`INSERT INTO employee_request_wfh_details (request_id, place, plan) VALUES (?, ?, ?)`, [id, s('place'), s('plan')])
    } else if (kind === 'outing') {
      await conn.execute(`INSERT INTO employee_request_outing_details (request_id, outing_date, out_time, back_time, place) VALUES (?, ?, ?, ?, ?)`,
        [id, s('date'), s('outTime'), s('backTime'), s('place')])
    } else {
      await conn.execute(`INSERT INTO employee_request_swap_details (request_id, off_date, work_date) VALUES (?, ?, ?)`, [id, s('offDate'), s('workDate')])
    }
    await conn.execute(
      `INSERT INTO employee_request_signatures (request_id, stage, action, signer_user_id, signer_name, signature_image) VALUES (?, 'submitter', 'submitted', ?, ?, ?)`,
      [id, me, user.name, signature],
    )
    if (req.body?.rememberSignature === true) {
      await conn.execute(`INSERT INTO user_saved_signatures (user_id, signature_image) VALUES (?, ?) ON DUPLICATE KEY UPDATE signature_image = VALUES(signature_image)`, [me, signature])
    }
    const recipients = status === 'pending_mgr'
      ? [user.manager_user_id].filter((userId): userId is number => Number.isSafeInteger(userId))
      : await findHrUserIds(conn, companyId)
    await notify(conn, recipients, id, 'submitted')
    await conn.commit()
    res.status(201).json({ id, requestNo, status })
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// ---------- อนุมัติ / ไม่อนุมัติ / ยกเลิก ----------
async function decide(req: Request, res: Response, action: 'approve' | 'reject') {
  need(req, PERM.access)
  const id = idParam(req), companyId = companyIdOf(req), me = req.user!.id, isHr = has(req, PERM.review)
  const note = nz(req.body?.note)
  if (action === 'reject' && !note) throw httpError(400, 'กรุณาระบุเหตุผลที่ไม่อนุมัติ')
  const signature = checkSignature(req.body?.signature, action === 'approve')

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query<any[]>(`SELECT id, employee_user_id, manager_user_id, status FROM employee_requests WHERE id = ? AND company_id = ? FOR UPDATE`, [id, companyId])
    const row = rows[0]
    if (!row) throw httpError(404, 'Request not found')
    if (row.employee_user_id === me) throw httpError(403, 'ไม่สามารถพิจารณาเอกสารของตนเองได้')
    let stage: 'manager' | 'hr'
    if (row.status === 'pending_mgr') { if (row.manager_user_id !== me) throw httpError(403, 'ไม่มีสิทธิ์พิจารณาเอกสารนี้'); stage = 'manager' }
    else if (row.status === 'pending_hr') { if (!isHr) throw httpError(403, 'ไม่มีสิทธิ์พิจารณาเอกสารนี้'); stage = 'hr' }
    else throw httpError(409, 'เอกสารไม่อยู่ในสถานะรออนุมัติแล้ว')

    const next = action === 'reject' ? 'rejected' : stage === 'manager' ? 'pending_hr' : 'approved'
    const [update] = await conn.execute<any>(
      `UPDATE employee_requests SET status = ?, rejected_stage = ?, rejection_note = ?, decided_at = IF(? IN ('approved','rejected'), CURRENT_TIMESTAMP, NULL)
        WHERE id = ? AND status = ?`,
      [next, action === 'reject' ? stage : null, action === 'reject' ? note : null, next, id, row.status],
    )
    if (!update.affectedRows) throw httpError(409, 'เอกสารไม่อยู่ในสถานะรออนุมัติแล้ว')
    const [names] = await conn.query<any[]>(`SELECT name FROM users WHERE id = ? LIMIT 1`, [me])
    await conn.execute(
      `INSERT INTO employee_request_signatures (request_id, stage, action, signer_user_id, signer_name, signature_image, note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, stage, action === 'approve' ? 'approved' : 'rejected', me, names[0]?.name ?? '', signature, note],
    )
    if (action === 'approve' && req.body?.rememberSignature === true) {
      await conn.execute(`INSERT INTO user_saved_signatures (user_id, signature_image) VALUES (?, ?) ON DUPLICATE KEY UPDATE signature_image = VALUES(signature_image)`, [me, signature])
    }
    await notify(conn, [row.employee_user_id], id, next === 'pending_hr' ? 'forwarded_to_hr' : next)
    if (next === 'pending_hr') await notify(conn, await findHrUserIds(conn, companyId), id, 'submitted')
    await conn.commit()
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
  need(req, PERM.access)
  const id = idParam(req)
  const [result] = await db.execute<any>(
    `UPDATE employee_requests SET status = 'cancelled', decided_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ? AND employee_user_id = ?
        AND (status = 'pending_mgr' OR (status = 'pending_hr' AND manager_user_id IS NULL))`,
    [id, companyIdOf(req), req.user!.id],
  )
  if (!result.affectedRows) throw httpError(409, 'ไม่สามารถยกเลิกเอกสารนี้ได้')
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
    `SELECT u.id, COALESCE(e.sick_leave_days, 0) AS sick, COALESCE(e.personal_leave_days, 0) AS personal, COALESCE(e.vacation_leave_days, 0) AS vacation
       FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [req.user!.id],
  )
  if (!userRows[0]) throw httpError(404, 'User not found')
  const policy = await loadPolicy(companyId, today)
  const ctx = await buildContext(kind, raw as Values, userRows[0], policy, today)
  const { checks } = validateRequest(kind, raw as Values, ctx)
  res.json({ checks: checks.map((check: { ok: boolean; key: string; params?: unknown }) => ({ ok: check.ok, key: check.key, params: check.params })) })
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
  need(req, PERM.access)
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
  need(req, PERM.access)
  const id = req.body?.id === undefined ? null : Number(req.body.id)
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) throw httpError(400, 'Invalid notification id')
  await db.execute(
    `UPDATE employee_request_notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE recipient_user_id = ? AND is_read = 0 ${id === null ? '' : 'AND id = ?'}`, id === null ? [req.user!.id] : [req.user!.id, id],
  )
  res.status(204).end()
}

// ---------- รายชื่อพนักงาน + โควตาลา (หน้า ledger) ----------
// สมมติว่า users มีคอลัมน์ company_id (ฟรอนต์ใช้ employee.companyId) — ปรับตามสคีมาจริง
export async function people(req: Request, res: Response) {
  need(req, PERM.access)
  const me = req.user!.id, isHr = has(req, PERM.review)
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
      WHERE u.deleted_at IS NULL AND ${isHr ? 'u.company_id = ?' : '(u.id = ? OR e.manager_user_id = ?)'}
      ORDER BY u.name`, isHr ? [companyIdOf(req)] : [me, me],
  )
  res.json(rows.map((row) => ({
    ...camelize(row), isActive: Boolean(row.is_active),
    emailNotificationsEnabled: row.email_notifications_enabled === null ? null : Boolean(row.email_notifications_enabled),
    sick: Number(row.sick), personal: Number(row.personal), vacation: Number(row.vacation), other: Number(row.other),
  })))
}