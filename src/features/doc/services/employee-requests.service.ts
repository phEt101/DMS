import type { DocKind, FormValues, MockDocument, SignatureStage, Status } from '../document-types'
import { apiUrl } from '../../../services/api'

const BASE = '/employee-requests'

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Array<{ key: string; params?: Record<string, string | number> }>) { super(message) }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData
  const response = await fetch(apiUrl(`${BASE}${path}`), {
    credentials: 'include',
    ...init,
    headers: { ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (response.status === 204) return undefined as T
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(json.message ?? `Request failed (${response.status})`, response.status, json.errors)
  return json as T
}
const body = (data: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(data) })

// ---------- types ----------
export type ApiListRow = {
  id: number; requestNo: string; kind: DocKind; status: Status | 'cancelled'
  days: number | null; reason: string | null; rejectionNote: string | null; rejectedStage: 'manager' | 'executive' | 'hr' | null
  submittedAt: string; startDate: string | null; endDate: string | null
  employeeUserId: number; employeeName: string; departmentName: string | null; medicalCertificateAvailable?: boolean
  employeeAvatarUrl?: string | null
  mgrSignerAvatarUrl?: string | null
  leaveType: string | null; otHours: number | null; otTask: string | null; place: string | null
  mgrSignerName: string | null; mgrSignedAt: string | null; mgrSignatureImage: string | null
  execSignerName: string | null; execSignedAt: string | null; execSignatureImage: string | null
  hrSignerAvatarUrl?: string | null; hrSignerName: string | null; hrSignedAt: string | null; hrSignatureImage: string | null
  submitterName: string | null; submitterSignatureImage: string | null
  execSignerAvatarUrl?: string | null
  submitterAvatarUrl?: string | null
}
export type ApiSignature = { stage: 'submitter' | 'manager' | 'executive' | 'hr'; action: string; signerName: string; signatureImage: string | null; note: string | null; signedAt: string; signerAvatarUrl?: string | null }
export type ApiDetail = ApiListRow & { detail: Record<string, unknown> | null; signatures: ApiSignature[]; canApprove: boolean; canCancel: boolean; canViewMedicalCertificate: boolean; flow?: { stages: Array<'manager' | 'executive' | 'hr'>; recordAfterStage: string | null } | null }
export type ApiCheck = { ok: boolean; key: string; params?: Record<string, string | number> }
export type ApiNotification = ApiListRow & { notificationId: number; event: string; isRead: boolean; createdAt: string }
export type ApiPolicy = { id: number; year: number; yearStart: string; yearEnd: string; expiryDate: string; leadPersonal: number; leadVacation: number; hoursPerDay: number; hourStep: number; certDays: number; otMax: number; fixDays: number }
export type ApiPerson = { id: number; name: string; email: string; isActive: boolean; avatarUrl: string | null; departmentName: string | null; employeeCode: string | null; sick: number; personal: number; vacation: number; other: number; sickUsed: number | null; sickPending: number | null; personalUsed: number | null; personalPending: number | null; vacationUsed: number | null; vacationPending: number | null; startDate: string | null; appointedDate: string | null; emailNotificationsEnabled: boolean | null }

// ---------- calls ----------
export const listRequests = (params: { status?: string; kind?: string; awaiting?: 'me'; mine?: 'me'; employeeId?: number } = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== 'all') query.set(key, String(value)) })
  return call<ApiListRow[]>(`/${query.size ? `?${query}` : ''}`)
}
export const getRequest = (id: number) => call<ApiDetail>(`/${id}`)
export const createRequest = (data: { kind: DocKind; values: FormValues; signature: string; rememberSignature: boolean }, medicalCertificate?: File) => {
  const form = new FormData()
  form.set('kind', data.kind)
  form.set('values', JSON.stringify(data.values))
  form.set('signature', data.signature)
  form.set('rememberSignature', String(data.rememberSignature))
  if (medicalCertificate) form.set('medicalCertificate', medicalCertificate)
  return call<{ id: number; requestNo: string; status: Status }>('/', { method: 'POST', body: form })
}
export const medicalCertificateUrl = (id: number) => apiUrl(`${BASE}/${id}/medical-certificate`)
export const approveRequest = (id: number, data: { signature?: string; rememberSignature?: boolean }) => call<{ id: number; status: Status }>(`/${id}/approve`, body(data))
export const decideRequest = (id: number, action: 'approve' | 'reject', data: { signature: string; rememberSignature?: boolean; note?: string }) => call<{ id: number; status: Status }>(`/${id}/${action}`, body(data))
export const rejectRequest = (id: number, note: string) => call<{ id: number; status: Status }>(`/${id}/reject`, body({ note }))
export const cancelRequest = (id: number) => call<{ id: number; status: 'cancelled' }>(`/${id}/cancel`, { method: 'POST' })
export const validateRequestDryRun = (kind: DocKind, values: FormValues) => call<{ checks: ApiCheck[] }>('/validate', body({ kind, values }))
export const listNotifications = () => call<ApiNotification[]>('/notifications')
export const markNotificationsRead = (id?: number) => call<void>('/notifications/read', body(id === undefined ? {} : { id }))
export const getPolicy = () => call<ApiPolicy>('/policy')
export const savePolicy = (policy: Omit<ApiPolicy, 'id' | 'expiryDate'>) => call<ApiPolicy>('/policy', { method: 'PUT', body: JSON.stringify(policy) })
export const getMySignature = () => call<{ signature: string }>('/signature/me')
export const listPeople = () => call<ApiPerson[]>('/people')
export type ApiBadges = { pendingApproval: number; unreadNotifications: number }
export const getBadges = () => call<ApiBadges>('/badges')
// ---------- กำหนดสิทธิ์ในการยื่นเอกสาร (Flow Rules) ----------
export type ApiFlowRule = {
  id: number; scope: 'department' | 'role'; departmentId: number | null; roleId: number | null; kind: string;
  /** แผนก/บทบาทที่กฎครอบคลุม (หลายตัวในกฎเดียวได้) — กฎเก่าจะมีค่าเดียวเท่ากับ departmentId/roleId */
  targetIds: number[];
  /** บทบาทที่กฎจำกัดเพิ่ม (เฉพาะ scope=department) — ว่าง = ทุกบทบาท */
  roleIds?: number[];
  firstStage: 'default' | 'pending_mgr' | 'pending_exec' | 'pending_hr';
  managerUserId: number | null; executiveUserId: number | null;
  requireManagerStage: boolean; requireExecutiveStage: boolean; requireHrStage: boolean;
  recordAfterStage: 'manager' | 'executive' | 'hr' | null; visibleInRecords: boolean; isActive: boolean;
  steps?: { stages: string[]; recordAfterStage: string };
  managerName?: string; executiveName?: string; roleName?: string; departmentName?: string;
}
export type ApiFlowOptions = {
  departments: Array<{ id: number; name: string; isHrDepartment: boolean }>;
  roles: Array<{ id: number; name: string }>;
  approvers: Array<{ id: number; name: string; roleName: string; departmentName: string }>;
}
export const getFlowRules = () => call<ApiFlowRulesResponse>('/flow-rules')
export type ApiFlowRulesResponse = ApiFlowOptions & { rules: ApiFlowRule[]; defaultFlow: { managerUserId: number | null; executiveUserId: number | null; requireManagerStage: boolean; requireExecutiveStage: boolean; requireHrStage: boolean; recordAfterStage: 'manager' | 'executive' | 'hr' | null; visibleInRecords: boolean; steps: { stages: string[]; recordAfterStage: string } } }
export const saveFlowRules = (rules: Array<Partial<ApiFlowRule>>) =>
  call<void>('/flow-rules', { method: 'PUT', body: JSON.stringify({ rules }) })

// ---------- mappers ----------
const bangkokDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
const STAGE: Record<ApiSignature['stage'], SignatureStage> = { submitter: 'ผู้ยื่น', manager: 'ผู้จัดการแผนก', executive: 'ผู้ประกอบการ', hr: 'HR' }
type MapperText = { locale: string; kinds: Record<string, string>; leaveTypes: Record<string, string>; day: string; hour: string; hoursPerDay: number }

// แปลงจำนวนวันเป็นข้อความชั่วโมงให้เข้าใจง่าย ตรงกับที่ผู้ใช้กรอก
// 1 วัน = hoursPerDay ชั่วโมง (ปกติ 8) — ครบ 8 ชม. แสดง "1 วัน", 11 ชม. แสดง "1 วัน 3 ชั่วโมง"
// ฐานข้อมูลเก็บ days เป็นทศนิยม 2 ตำแหน่ง (เช่น 0.375 → 0.38) จึงปัดเศษนาทีเล็ก ๆ จากการปัดทิ้ง (≤2 นาที = 0)
const daysLabel = (days: number | null | undefined, t: MapperText): string => {
  if (days === null || days === undefined) return ''
  const perDay = t.hoursPerDay > 0 ? t.hoursPerDay : 8
  let totalHours = days * perDay
  let wholeHours = Math.floor(totalHours)
  let minutes = Math.round((totalHours - wholeHours) * 60)
  if (minutes >= 58) { wholeHours += 1; minutes = 0 }
  if (minutes <= 2) minutes = 0
  totalHours = wholeHours + minutes / 60
  const wholeDays = Math.floor(totalHours / perDay)
  const restHours = Math.round((totalHours - wholeDays * perDay) * 60) / 60
  const restWhole = Math.floor(restHours)
  const restMinutes = Math.round((restHours - restWhole) * 60)
  const parts: string[] = []
  if (wholeDays > 0) parts.push(`${wholeDays} ${t.day}`)
  if (restWhole > 0) parts.push(`${restWhole} ${t.hour}`)
  if (restMinutes > 0) parts.push(`${restMinutes} นาที`)
  return parts.join(' ') || `0 ${t.hour}`
}

export function mapListRow(row: ApiListRow, t: MapperText): MockDocument {
  const fmt = (v?: string | null) => v ? new Intl.DateTimeFormat(t.locale, { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${v}T00:00:00`)) : ''
  const leaveName = t.leaveTypes[row.leaveType ?? ''] ?? row.leaveType ?? ''
  const title = row.kind === 'leave' ? `${leaveName} · ${daysLabel(row.days, t) || `${row.days ?? 0} ${t.day}`}`
    : row.kind === 'ot' ? `OT · ${row.otHours ?? ''} ${t.hour}` : t.kinds[row.kind] ?? row.kind
  const range = row.startDate && row.endDate && row.startDate !== row.endDate ? `${fmt(row.startDate)} – ${fmt(row.endDate)}` : fmt(row.startDate)
  const extra = row.kind === 'ot' ? row.otTask : row.place ?? row.reason
  return {
    id: row.id, no: row.requestNo, kind: row.kind, title, summary: [range, extra].filter(Boolean).join(' · '),
    medicalCertificateAvailable: row.medicalCertificateAvailable,
    employee: row.employeeName, department: row.departmentName ?? '', date: bangkokDate(row.submittedAt),
    employeeAvatarUrl: row.employeeAvatarUrl ?? undefined,
    status: row.status as Status, leaveType: (row.leaveType ?? undefined) as MockDocument['leaveType'],
    from: row.startDate ?? undefined, to: row.endDate ?? undefined, days: row.days ?? undefined,
    reason: row.reason ?? undefined, note: row.rejectionNote ?? undefined, rejectedBy: row.rejectedStage ?? undefined,
    mgrSignerName: row.mgrSignerName ?? undefined, mgrSignedAt: row.mgrSignedAt ?? undefined,
    mgrSignerAvatarUrl: row.mgrSignerAvatarUrl ?? undefined,
    execSignerName: row.execSignerName ?? undefined, execSignedAt: row.execSignedAt ?? undefined,
    hrSignerName: row.hrSignerName ?? undefined, hrSignedAt: row.hrSignedAt ?? undefined,
    hrSignerAvatarUrl: row.hrSignerAvatarUrl ?? undefined,
    signatures: {
      ...(row.submitterName && row.submitterSignatureImage ? { 'ผู้ยื่น': { image: row.submitterSignatureImage, name: row.submitterName, date: row.submittedAt ? String(row.submittedAt).slice(0,10) : '', avatarUrl: row.employeeAvatarUrl } } : {}),
      // ยืนยันโดยไม่เซ็น = signatureImage เป็น null → ยังแสดงขั้นตอน + ชื่อผู้ยืนยัน (ไม่มีรูป)
      ...(row.mgrSignerName ? { 'ผู้จัดการแผนก': { image: row.mgrSignatureImage ?? '', name: row.mgrSignerName, date: row.mgrSignedAt ?? '', avatarUrl: row.mgrSignerAvatarUrl } } : {}),
      ...(row.execSignerName ? { 'ผู้ประกอบการ': { image: row.execSignatureImage ?? '', name: row.execSignerName, date: row.execSignedAt ?? '', avatarUrl: row.execSignerAvatarUrl } } : {}),
      ...(row.hrSignerName ? { 'HR': { image: row.hrSignatureImage ?? '', name: row.hrSignerName, date: row.hrSignedAt ?? '', avatarUrl: row.hrSignerAvatarUrl } } : {}),
    },
  } as MockDocument
}

export function mapDetail(row: ApiDetail, t: MapperText): MockDocument {
  const base = mapListRow(row, t)
  const d = (row.detail ?? {}) as Record<string, unknown>
  const s = (v: unknown) => (v == null ? '' : String(v))
  const formData: FormValues = {
    leaveType: s(d.leaveType), byHour: Boolean(d.byHour), cert: Boolean(d.hasMedicalCertificate), hours: s(d.hours),
    start: s(d.startTime), end: s(d.endTime),
    dayType: s(d.dayType), date: s(d.date), task: s(d.task),
    from: row.startDate ?? s(d.date), to: row.endDate ?? s(d.date),
    cause: s(d.cause), inTime: s(d.inTime), outTime: s(d.outTime), backTime: s(d.backTime),
    place: s(d.place), reason: row.reason ?? '',
    company: s(d.companyName), address: s(d.address), province: s(d.province), district: s(d.district),
    subdistrict: s(d.subdistrict), postalCode: s(d.postalCode), country: s(d.country),
    latitude: s(d.latitude), longitude: s(d.longitude), project: s(d.projectName),
    customerName: s(d.customerName), customerPosition: s(d.customerPosition), phone: s(d.phone),
    workDetails: s(d.workDetails), remark: s(d.remark),
  }
  const signatures: NonNullable<MockDocument['signatures']> = {}
  const displayedActions = ['approved', 'rejected', 'submitted']
  for (const sig of row.signatures) {
    // เก็บผู้ปฏิเสธไว้แสดงในขั้นตอนและรูปผู้เกี่ยวข้อง แม้ไม่มีภาพลายเซ็น
    if (displayedActions.includes(sig.action)) signatures[STAGE[sig.stage]] = { image: sig.signatureImage ?? '', name: sig.signerName, date: bangkokDate(sig.signedAt), avatarUrl: sig.signerAvatarUrl ?? null }
  }
  return { ...base, formData, medicalCertificateAvailable: Boolean(d.medicalCertificateAvailable), signatures, flow: row.flow ?? null } as MockDocument
}

// แปลงจำนวนวัน (ทศนิยม) เป็นข้อความอ่านง่าย ตามชั่วโมงทำงานต่อวันของบริษัท
// เช่น 0.375 วัน × 8 ชม. = 3 ชม. → "3 ชั่วโมง" · 1.25 วัน → "1 วัน 2 ชั่วโมง"
// ฐานข้อมูลเก็บ days เป็นทศนิยม 2 ตำแหน่ง (0.375 → 0.38) จึงปัดเศษนาทีเล็ก ๆ จากการปัดทิ้ง (≤2 นาที = 0)
function daysToText(days: number | undefined | null, hoursPerDay: number, day: string, hour: string): string {
  if (days === null || days === undefined) return ''
  const perDay = hoursPerDay > 0 ? hoursPerDay : 8
  const totalHours = days * perDay
  let wholeHours = Math.floor(totalHours + 1e-9)
  let minutes = Math.round((totalHours - wholeHours) * 60)
  if (minutes >= 58) { wholeHours += 1; minutes = 0 }
  if (minutes <= 2) minutes = 0
  const wholeDays = Math.floor(wholeHours / perDay)
  const restHours = wholeHours - wholeDays * perDay
  const parts: string[] = []
  if (wholeDays > 0) parts.push(`${wholeDays} ${day}`)
  if (restHours > 0) parts.push(`${restHours} ${hour}`)
  if (minutes > 0) parts.push(`${minutes} นาที`)
  return parts.join(' ') || `0 ${hour}`
}

// แปลง checks จาก server ให้เป็นรูปแบบเดิมที่ฟอร์มใช้ ({ ok, message })
export function toFormChecks(checks: ApiCheck[], copy: any) {
  return checks.map((check) => {
    const params = { ...(check.params ?? {}) } as Record<string, string | number>
    if (typeof params.type === 'string') params.type = copy.leaveTypes[params.type] ?? params.type
    // จำนวนวันที่เป็นทศนิยม (เช่น 0.375) แปลงเป็น "X วัน Y ชั่วโมง" ตามชั่วโมงทำงานต่อวัน — ใช้กับข้อความยอดคงเหลือ/ขอลา
    const perDay = Number(params.hoursPerDay ?? 0) || 8
    const asHours = Number(params.isHour ?? 0) === 1
    for (const key of ['remaining', 'requested', 'days']) {
      const value = params[key]
      if (typeof value === 'number') params[key] = daysToText(value, asHours ? perDay : 0, copy.ledger.day, copy.ledger.hour) || String(value)
    }
    const message = Object.entries(params).reduce((text, [name, value]) => text.split(`{${name}}`).join(String(value)), String(copy.validation[check.key] ?? check.key))
    return { ok: check.ok, message, key: check.key }
  })
  
}
