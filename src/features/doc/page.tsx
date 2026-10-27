import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as PointerEventType } from 'react'
import { FaCalendarDays, FaClock, FaFileLines, FaLocationDot, FaRotate, FaPlus, FaUser, FaUsers, FaXmark } from 'react-icons/fa6'
import type { Translations } from '../../locales'
import { LeaveLedger, type LedgerEntry } from './leave-ledger'
import './documents.css'
import DocAllDocumentsDetail from './all-documents/components/doc-alldoc-detail'
import DocAllDocumentsList from './all-documents/components/doc-alldoc-list'
import DocAllDocumentsFilters from './all-documents/components/doc-alldoc-filters'
import DocLeavePolicySettings from './leave-policy/components/doc-leave-policy-settings'
import DocFlowRulesSettings from './flow-rules/components/doc-flow-rules-settings'
import DocDatabaseEmployeesPanel from './employees/components/doc-database-employees-panel'
import DocNotificationsPanel from './notifications/components/doc-notifications-panel'
import DocNewDocumentModal from './submission/components/doc-new-document-modal'
import DocPendingApproval from './pending-approval/components/doc-pending-approval'
import { PaginationFooter } from '../../components/pagination-footer'
import ConfirmDialog from '../../components/confirm-dialog'
import { useToast } from '../../components/toast-provider'
import type { DocKind, FormValues, MockDocument, MockEmployee, MockNotification, MockPolicy, SignatureStage, Status } from './document-types'
import { listUsers, type User } from '../settings/users/services/users.service'
import { listDepartments } from '../settings/access/departments/services/departments.service'
import { useAuth } from '../auth/hooks/use-auth'
import {
  ApiError, approveRequest, cancelRequest, createRequest, getMySignature, getPolicy, getRequest,
  listNotifications, listPeople, listRequests, mapDetail, mapListRow, markNotificationsRead, rejectRequest, savePolicy, toFormChecks, validateRequestDryRun,
} from './services/employee-requests.service'
import DocRejectModal from './all-documents/components/doc-reject-modal'

// true = ใช้ข้อมูลจริงจาก /api/employee-requests (all, pending, ส่งเอกสาร, เซ็น/ไม่อนุมัติ, ยกเลิก, นโยบาย)
// false = กลับไปใช้ mock + localStorage เหมือนเดิม
const USE_DB = true

type View = 'all' | 'pending' | 'ledger' | 'employees' | 'policy' | 'flowRules' | 'notifications'
type FormCheck = { ok: boolean; message: string; key?: string }
const INITIAL_POLICY: MockPolicy = { year:2569, expiry:'25 พฤศจิกายน 2569', yearStart:'2025-11-26', yearEnd:'2026-11-25', leadPersonal:1, leadVacation:15, hoursPerDay:8, hourStep:1, certDays:3, otMax:4, fixDays:7 }

const KIND_INFO_DEFAULT: Record<DocKind, { title: string; description: string; icon: typeof FaFileLines; group: 'leave' | 'ot' | 'other' }> = {
  leave: { title: 'ใบลา', description: 'ลาป่วย ลากิจ พักร้อน ลาคลอด และอื่น ๆ', icon: FaCalendarDays, group: 'leave' },
  ot: { title: 'ขอทำงานล่วงเวลา (OT)', description: 'ขออนุมัติวันและเวลาทำงานล่วงเวลา', icon: FaClock, group: 'ot' },
  timefix: { title: 'ขอแก้ไขเวลาเข้า–ออกงาน', description: 'แจ้งลืมสแกนหรือแก้ไขเวลาเข้างาน', icon: FaFileLines, group: 'other' },
  outing: { title: 'ขอออกนอกสถานที่', description: 'ขออนุญาตออกไปปฏิบัติงานระหว่างวัน', icon: FaLocationDot, group: 'other' },
}
const LEAVE_TYPES_DEFAULT: Record<string, string> = { personal:'ลากิจ', sick:'ลาป่วย', vacation:'ลาพักร้อน', emergency:'ลาพักร้อนฉุกเฉิน', unpaid:'ลากิจไม่รับค่าจ้าง', maternity:'ลาคลอด', ordain:'ลาบวช', marriage:'ลาสมรส', other:'ลาอื่น ๆ' }
const FORM_FIELDS_DEFAULT: Record<DocKind, Array<{ key: string; label: string; type: 'text' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'checkbox'; options?: Record<string, string>; step?: number; wide?: boolean }>> = {
  leave:[{key:'leaveType',label:'ประเภทการลา',type:'select',options:LEAVE_TYPES_DEFAULT,wide:true},{key:'byHour',label:'ลาเป็นชั่วโมง (ระบุจำนวนชั่วโมงได้เลย · 1 วัน = 8 ชม.)',type:'checkbox',wide:true},{key:'from',label:'วันที่ลา',type:'date'},{key:'to',label:'ถึงวันที่',type:'date'},{key:'start',label:'เวลาเริ่มลา',type:'time'},{key:'end',label:'เวลาสิ้นสุดลา',type:'time'},{key:'hours',label:'จำนวนชั่วโมงที่ลา (เลือกวัน = คำนวณอัตโนมัติ · แก้ไขได้ เช่น 1 = ลา 1 ชั่วโมง)',type:'number',step:.5,wide:true},{key:'reason',label:'เหตุผลการลา',type:'textarea',wide:true}],
  ot:[{key:'dayType',label:'ประเภทวัน',type:'select',options:{weekday:'วันทำงานปกติ',weekend:'วันหยุดประจำสัปดาห์',holiday:'วันหยุดนักขัตฤกษ์'},wide:true},{key:'date',label:'วันที่ทำ OT',type:'date',wide:true},{key:'start',label:'เวลาเริ่ม',type:'time'},{key:'end',label:'เวลาสิ้นสุด',type:'time'},{key:'hours',label:'รวม (ชั่วโมง)',type:'number',step:.5,wide:true},{key:'task',label:'งาน / โครงการที่ทำ',type:'text',wide:true},{key:'reason',label:'เหตุผลที่ต้องทำ OT',type:'textarea',wide:true}],
  timefix:[{key:'date',label:'วันที่ต้องการแก้ไข',type:'date'},{key:'cause',label:'สาเหตุ',type:'select',options:{forgot:'ลืมสแกนนิ้ว',device:'เครื่องสแกนขัดข้อง',offsite:'ปฏิบัติงานนอกสถานที่',other:'อื่น ๆ'}},{key:'inTime',label:'เวลาเข้างานที่ถูกต้อง',type:'time'},{key:'outTime',label:'เวลาออกงานที่ถูกต้อง',type:'time'},{key:'reason',label:'รายละเอียด',type:'textarea',wide:true}],
  outing:[{key:'from',label:'ตั้งแต่วันที่',type:'date'},{key:'to',label:'ถึงวันที่',type:'date'},{key:'outTime',label:'เวลาออก',type:'time'},{key:'backTime',label:'เวลากลับโดยประมาณ',type:'time'},{key:'company',label:'บริษัท',type:'text',wide:true},{key:'project',label:'โครงการ',type:'text',wide:true},{key:'customerName',label:'ชื่อลูกค้า',type:'text'},{key:'customerPosition',label:'ตำแหน่ง',type:'text'},{key:'phone',label:'เบอร์โทร',type:'text',wide:true},{key:'workDetails',label:'รายละเอียดงาน',type:'textarea',wide:true},{key:'remark',label:'หมายเหตุ',type:'textarea',   wide:true}],
  }

const daysBetween = (from: string, to: string) => {
  if (!from || !to || to < from) return 0
  let count = 0
  const date = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (date <= end) { if (date.getDay() !== 0 && date.getDay() !== 6) count += 1; date.setDate(date.getDate() + 1) }
  return count
}
const todayInBangkok = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPart['type']) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const timeMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1 }

// ใช้เฉพาะโหมด mock (USE_DB = false) — โหมด DB ใช้ผลตรวจจาก server (/validate)
const validateSubmission = (kind: DocKind, values: FormValues, docs: MockDocument[], employee: MockEmployee, policy: MockPolicy, copy: any): FormCheck[] => {
  const checks: FormCheck[] = []
  const add = (ok: boolean, message: string, key?: string) => checks.push({ ok, message, key })
  const msg = (key: string, values: Record<string, string | number> = {}) => Object.entries(values).reduce((result, [name, value]) => result.split(`{${name}}`).join(String(value)), copy.validation[key] as string)
  const v = (key: string) => String(values[key] ?? '').trim()
  const todayIso = todayInBangkok()
  const today = new Date(`${todayIso}T00:00:00`)
  if (kind === 'leave') {
    const type = v('leaveType'), from = v('from'), to = v('to'), isHour = type === 'emergency' && values.byHour === true
    let qty = Number(v('days'))
    add(Boolean(from && to && to >= from), msg('dateRange'))
    if (isHour) {
      const start = timeMinutes(v('start')), end = timeMinutes(v('end')), hours = (end - start) / 60
      if (start >= 0 && end > start) {
        // มีเวลาเริ่ม/สิ้นสุด → คำนวณจากช่วงเวลา (ไม่จำกัดชั่วโมงต่อวัน)
        add(true, msg('hourlyLeavePositive'))
      } else {
        // พิมพ์ชั่วโมงตรง ๆ — เช็คแค่ว่าต้องมากกว่า 0 (ไม่จำกัดชั่วโมงต่อวัน)
        add(Number(v('hours')) > 0, msg('hourlyLeavePositive'))
      }
      const effective = start >= 0 && end > start ? hours : Number(v('hours'))
      values.hours = effective > 0 ? String(Math.ceil(effective / policy.hourStep) * policy.hourStep) : ''
      values.days = effective > 0 ? String(Math.ceil(effective / policy.hourStep) * policy.hourStep / policy.hoursPerDay) : ''
      qty = Number(values.days) || 0
    } else add(qty > 0, msg('daysPositive'))
    add(Boolean(v('reason')), msg(type === 'emergency' ? 'emergencyReason' : 'leaveReason'))
    if (from && to && to >= from) {
      const overlap = docs.some((doc) => doc.employee === employee.name && doc.kind === 'leave' && doc.status !== 'rejected' && doc.from && doc.to && doc.from <= to && doc.to >= from)
      add(!overlap, msg('overlap'))
    }
    const startDate = from ? new Date(`${from}T00:00:00`) : null
    const leadDays = startDate ? Math.floor((startDate.getTime() - today.getTime()) / 86400000) : 0
    const leadWorkdays = from ? daysBetween(todayIso, from) - (todayIso <= from && ![0,6].includes(today.getDay()) ? 1 : 0) : 0
    if (type === 'personal' || type === 'unpaid') add(leadDays >= policy.leadPersonal, msg('personalLead', { days: policy.leadPersonal }))
    if (type === 'vacation') add(leadWorkdays >= policy.leadVacation, msg('vacationLead', { days: policy.leadVacation }))
    if (type === 'emergency') add(Boolean(from && from >= todayIso), msg('emergencyFromToday'))
    if (['sick','personal','vacation','emergency'].includes(type) && from && to) add(from >= policy.yearStart && to <= policy.yearEnd, msg('withinYear', { year: policy.year, from: policy.yearStart, to: policy.yearEnd }))
    const approvedUsage = (leaveType: string) => docs.filter((doc) => doc.employee === employee.name && doc.kind === 'leave' && doc.leaveType === leaveType && doc.status !== 'rejected').reduce((sum, doc) => sum + (doc.days ?? 0), 0)
    if (type === 'sick' || type === 'personal' || type === 'vacation') {
      const limit = type === 'sick' ? employee.sick : type === 'personal' ? employee.personal : employee.vacation
      const remaining = limit - approvedUsage(type)
      add(qty <= remaining, msg('leaveBalance', { type: copy.leaveTypes[type], remaining: Math.max(0, remaining), requested: qty || 0 }))
    }
    if (type === 'emergency') {
      const personalRemaining = employee.personal - approvedUsage('personal')
      const vacationRemaining = employee.vacation - approvedUsage('vacation') - approvedUsage('emergency')
      add(personalRemaining <= 0, msg('usePersonalFirst', { days: Math.max(0, personalRemaining) }))
      add(qty <= vacationRemaining, msg('vacationBalance', { days: vacationRemaining }))
    }
    if (type === 'sick' && from && to && to >= from) {
      const a = new Date(`${from}T00:00:00`), b = new Date(`${to}T00:00:00`)
      const needsCert = qty >= policy.certDays || [1,5].includes(a.getDay()) || [1,5].includes(b.getDay()) || daysBetween(from,to) < Math.round((b.getTime()-a.getTime())/86400000)+1
      if (needsCert) add(values.cert === true, msg('certificateRequired'), 'certificateRequired')
    }
  }
  if (kind === 'ot') {
    const start = timeMinutes(v('start')), end = timeMinutes(v('end')), hours = (end-start)/60
    add(Boolean(v('date')), msg('otDate')); add(start >= 0 && end > start, msg('endAfterStart'))
    add(hours > 0 && hours <= policy.otMax, msg('otLimit', { hours: policy.otMax }))
    add(Boolean(v('task')), msg('taskRequired')); add(Boolean(v('reason')), msg('otReason'))
    values.hours = hours > 0 ? String(Math.round(hours*2)/2) : ''
  }
  if (kind === 'timefix') { add(Boolean(v('date') && v('date') < todayIso), msg('pastDate')); const ago = v('date') ? (today.getTime()-new Date(`${v('date')}T00:00:00`).getTime())/86400000 : Infinity; add(ago <= policy.fixDays, msg('fixLimit', { days: policy.fixDays })); add(Boolean(v('inTime') || v('outTime')), msg('timeRequired')); add(Boolean(v('reason')), msg('detailsRequired')) }
  if (kind === 'outing') { add(Boolean(v('from') && v('to') && v('to') >= v('from')), msg('dateRange')); add(Boolean(v('from') && v('from') >= todayIso), msg('todayOrFuture')); add(timeMinutes(v('outTime')) >= 0, msg('outTimeRequired')); add(!v('backTime') || timeMinutes(v('backTime')) > timeMinutes(v('outTime')), msg('backAfterOut')); add(Boolean(v('company')), msg('companyRequired')); add(Boolean(v('address')), msg('addressRequired')); add(Boolean(v('workDetails')), msg('workDetailsRequired')); add(!v('phone') || (/^[0-9+()\s-]{8,50}$/.test(v('phone')) && v('phone').replace(/\D/g, '').length >= 8),  msg('phoneInvalid')) }
  return checks
}

const INITIAL_DOCS: MockDocument[] = [
  { id: 1, no: 'LV-2569-0012', kind: 'leave', title: 'ลากิจ · 1 วัน', summary: '30 ต.ค. 2569 · ธุระส่วนตัว', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-10-10', status: 'pending_hr', leaveType:'personal', from:'2026-10-30', to:'2026-10-30', days:1, reason:'ธุระส่วนตัว' },
  { id: 2, no: 'LV-2569-0011', kind: 'leave', title: 'ลาพักร้อน · 3 วัน', summary: '18–20 พ.ย. 2569 · พักผ่อนปลายปี', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-10-12', status: 'pending_mgr', leaveType:'vacation', from:'2026-11-18', to:'2026-11-20', days:3, reason:'พักผ่อนปลายปี' },
  { id: 3, no: 'OT-2569-0008', kind: 'ot', title: 'ทำ OT · 2.5 ชั่วโมง', summary: '14 ต.ค. 2569 · ออกแบบแบนเนอร์งานอีเวนต์', employee: 'วีระ ศรีสุข', department: 'การตลาด', date: '2026-10-12', status: 'pending_mgr' },
  { id: 4, no: 'LV-2569-0010', kind: 'leave', title: 'ลาป่วย · 1 วัน', summary: '9 ต.ค. 2569 · แนบใบรับรองแพทย์', employee: 'วีระ ศรีสุข', department: 'การตลาด', date: '2026-10-12', status: 'pending_mgr', leaveType:'sick', from:'2026-10-09', to:'2026-10-09', days:1, reason:'ป่วย มีใบรับรองแพทย์' },
  { id: 6, no: 'LV-2569-0009', kind: 'leave', title: 'ลาพักร้อน · 3 วัน', summary: '15–17 มิ.ย. 2569 · เดินทางกับครอบครัว', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-05-19', status: 'approved', leaveType:'vacation', from:'2026-06-15', to:'2026-06-17', days:3, reason:'เดินทางกับครอบครัว' },
  { id: 7, no: 'LV-2569-0008', kind: 'leave', title: 'ลากิจ · 1 วัน', summary: '14 ก.ย. 2569 · ธุระที่ธนาคาร', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-09-09', status: 'rejected', note: 'ตรงกับช่วงปิดงบ ขอเลื่อนเป็นสัปดาห์ถัดไป', leaveType:'personal', from:'2026-09-14', to:'2026-09-14', days:1, reason:'ธุระที่ธนาคาร', rejectedBy:'manager' },
  { id: 8, no: 'TF-2569-0002', kind: 'timefix', title: 'ขอแก้เวลาเข้างาน', summary: '9 ต.ค. 2569 · ลืมสแกนเข้างานตอนเช้า', employee: 'ธนากร ปัญญา', department: 'ฝ่ายขาย', date: '2026-10-12', status: 'pending_mgr' },
]
const INITIAL_EMPLOYEES: MockEmployee[] = [
  { id:'e1', name:'สมชาย ใจดี', code:'BCG-0142', department:'การตลาด', email:'somchai@example.com', emailNotify:true, role:'พนักงาน', sick:30, personal:3, vacation:6, other:0, active:true, startDate:'2023-03-01', appointedDate:'2023-06-01' },
  { id:'e2', name:'นภา วงศ์สุข', code:'BCG-0107', department:'การตลาด', email:'napa@example.com', emailNotify:true, role:'ผู้จัดการแผนก', sick:30, personal:3, vacation:10, other:0, active:true, startDate:'2019-08-15', appointedDate:'2019-11-15' },
  { id:'e3', name:'วีระ ศรีสุข', code:'BCG-0155', department:'การตลาด', email:'weera@example.com', emailNotify:true, role:'พนักงาน', sick:30, personal:3, vacation:6, other:0, active:true, startDate:'2024-01-08', appointedDate:'2024-04-08' },
  { id:'e4', name:'ศิริพร แก้วมณี', code:'BCG-0021', department:'บุคคล', email:'siriporn@example.com', emailNotify:true, role:'HR', sick:30, personal:3, vacation:10, other:0, active:true, startDate:'2018-02-01', appointedDate:'2018-05-01' },
  { id:'e5', name:'ประเสริฐ ลิ้มสกุล', code:'BCG-0098', department:'ฝ่ายขาย', email:'prasert@example.com', emailNotify:true, role:'ผู้จัดการแผนก', sick:30, personal:3, vacation:10, other:0, active:true, startDate:'2020-06-01', appointedDate:'2020-09-01' },
  { id:'e6', name:'ธนากร ปัญญา', code:'BCG-0188', department:'ฝ่ายขาย', email:'thanakorn@example.com', emailNotify:false, role:'พนักงาน', sick:30, personal:3, vacation:6, other:0, active:true, startDate:'2025-02-03', appointedDate:'2025-05-03' },
]
const INITIAL_NOTIFICATIONS: MockNotification[] = [
  { id:1, title:'ใบ OT ของวีระ ศรีสุข รอพิจารณา', body:'14 ต.ค. 2569 · 18:00–20:30 · 2.5 ชั่วโมง', date:'2026-10-12T09:00:00+07:00', read:false, documentId:3 },
  { id:2, title:'ใบลาของสมชาย ใจดี รอ HR ตรวจ', body:'ลากิจ 30 ต.ค. 2569 · 1 วัน', date:'2026-10-12T10:00:00+07:00', read:false, documentId:1 },
  { id:3, title:'ผู้จัดการอนุมัติใบลาของคุณแล้ว', body:'เอกสารส่งต่อให้ HR ตรวจแล้ว', date:'2026-10-11T15:00:00+07:00', read:true, documentId:1 },
]
const MOCK_STORAGE_KEY = 'boswell-leave-v2-mock'
// key ที่ Topbar ใช้ส่ง document id เมื่อคลิกแจ้งเตือน → ให้หน้าเอกสารเปิด popup รายละเอียดทันที
export const OPEN_DOCUMENT_KEY = 'dms-open-doc'
type MockSnapshot = { policy: MockPolicy; documents: MockDocument[]; employees: MockEmployee[]; notifications: MockNotification[]; mockRole: MockEmployee['role']; emailEnabled: boolean; ledgerEmployeeId: string; savedSignature?: string }
function readMockSnapshot(): Partial<MockSnapshot> {
  if (USE_DB) return {}
  try { return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? '{}') as Partial<MockSnapshot> } catch { return {} }
}

export default function DocumentPage({ translations, view = 'all', language = 'th' }: { translations: Translations; view?: View; language?: 'th' | 'en' }) {
  const rawCopy: any = translations.features.documentManagement
  // โหมด DB: ตัดข้อความตัวอย่างของ mock ออก เพราะ id จริงจะชนกับ id ของตัวอย่าง
  const copy: any = useMemo(() => USE_DB ? { ...rawCopy, sampleDocuments: {}, sampleNotifications: {} } : rawCopy, [rawCopy])
  const { user } = useAuth()
  const { showToast } = useToast()
  const dateText = (value: string) => new Intl.DateTimeFormat(copy.dateLocale, { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${value}T00:00:00`))
  const KIND_INFO = Object.fromEntries(Object.entries(KIND_INFO_DEFAULT).map(([key, info]) => [key, { ...info, title: copy.kinds[key as DocKind], description: copy.kindDescriptions[key as DocKind] }])) as typeof KIND_INFO_DEFAULT
  const LEAVE_TYPES = copy.leaveTypes
  const FORM_FIELDS = Object.fromEntries(Object.entries(FORM_FIELDS_DEFAULT).map(([kind, fields]) => [kind, fields.map((field) => ({ ...field, label: copy.fieldLabels[field.key as keyof typeof copy.fieldLabels] ?? field.label, ...(field.key === 'leaveType' ? { options: LEAVE_TYPES } : field.options ? { options: Object.fromEntries(Object.entries(field.options).map(([key]) => [key, copy.fieldOptions[key as keyof typeof copy.fieldOptions] ?? key])) } : {}) }))])) as typeof FORM_FIELDS_DEFAULT
  // cancelled: เอกสารถูกยกเลิก — คลิกแจ้งเตือนเข้ามายังต้องแสดงรายละเอียดได้ ไม่งั้น STATUS_INFO[status] เป็น undefined แล้วหน้าจอขาว
  const STATUS_INFO = { pending_mgr: { label: copy.statuses.pending_mgr, className: 'pending' }, pending_exec: { label: copy.statuses.pending_exec, className: 'pending' }, pending_hr: { label: copy.statuses.pending_hr, className: 'pending' }, approved: { label: copy.statuses.approved, className: 'approved' }, rejected: { label: copy.statuses.rejected, className: 'rejected' }, cancelled: { label: copy.statuses.cancelled, className: 'rejected' } }

  const [policy, setPolicy] = useState<MockPolicy>(() => ({ ...INITIAL_POLICY, ...readMockSnapshot().policy }))
  const [policyDraft, setPolicyDraft] = useState<MockPolicy>(() => ({ ...INITIAL_POLICY, ...readMockSnapshot().policy }))
  const [documents, setDocuments] = useState<MockDocument[]>(() => USE_DB ? [] : (readMockSnapshot().documents ?? INITIAL_DOCS))
  const [employees, setEmployees] = useState(() => readMockSnapshot().employees ?? INITIAL_EMPLOYEES)
  const [dbPeople, setDbPeople] = useState<import('./services/employee-requests.service').ApiPerson[]>([])
  const [notifications, setNotifications] = useState(() => readMockSnapshot().notifications ?? INITIAL_NOTIFICATIONS)
  const [mockRole, setMockRole] = useState<MockEmployee['role']>(() => readMockSnapshot().mockRole ?? 'พนักงาน')
  const [ledgerEmployeeId, setLedgerEmployeeId] = useState(() => readMockSnapshot().ledgerEmployeeId ?? 'e1')
  const [notificationTab, setNotificationTab] = useState<'app' | 'email'>('app')
  const [emailEnabled, setEmailEnabled] = useState(() => readMockSnapshot().emailEnabled ?? true)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [dbEmployees, setDbEmployees] = useState<User[]>([])
  const [dbEmployeesLoading, setDbEmployeesLoading] = useState(false)
  const [dbEmployeesError, setDbEmployeesError] = useState('')
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
  const [signingDocumentId, setSigningDocumentId] = useState<number | null>(null)
  const [savedSignature, setSavedSignature] = useState(() => readMockSnapshot().savedSignature ?? '')
  const [signatureHasInk, setSignatureHasInk] = useState(false)
  const [signatureEdited, setSignatureEdited] = useState(false)
  const [rememberSignature, setRememberSignature] = useState(true)
  const signatureCanvas = useRef<HTMLCanvasElement>(null)
  const signatureDrawing = useRef(false)
  const signaturePreviewImage = useRef<HTMLImageElement | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // ขอบเขตการแสดงผล: 'mine' = เฉพาะเอกสารของตัวเอง (ค่าเริ่มต้น) · 'related' = ของตัวเอง + ที่เกี่ยวข้อง
  const [scope, setScope] = useState<'mine' | 'related'>('mine')
  const [kindFilter, setKindFilter] = useState('all')
  // กรองตามแผนกของผู้ยื่น (ทางเลือก: 'all' = ทุกแผนก)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [draftDepartment, setDraftDepartment] = useState('all')
  // กรองตามผู้ยื่น (ทางเลือก: 'all' = ทุกคน)
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [draftEmployee, setDraftEmployee] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState('all')
  const [draftKind, setDraftKind] = useState('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedKind, setSelectedKind] = useState<DocKind | ''>('')
  const [formValues, setFormValues] = useState<FormValues>({})
  const [medicalCertificateFile, setMedicalCertificateFile] = useState<File | null>(null)
  const [pendingSubmission, setPendingSubmission] = useState<{ kind: DocKind; values: FormValues } | null>(null)
  const [rejectTarget, setRejectTarget] = useState<MockDocument | null>(null)
  const [rejectSubmitting, setRejectSubmitting] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [detail, setDetail] = useState<{ doc: MockDocument; canApprove: boolean; canCancel: boolean; canViewMedicalCertificate: boolean } | null>(null)
  const [serverChecks, setServerChecks] = useState<FormCheck[]>([])
  const [validatingForm, setValidatingForm] = useState(false)

  const mapperText = useMemo(() => ({ locale: copy.dateLocale, kinds: copy.kinds, leaveTypes: copy.leaveTypes, day: copy.ledger.day, hour: copy.ledger.hour, hoursPerDay: policy.hoursPerDay }), [copy, policy])
  const errorText = useCallback((error: unknown) => error instanceof ApiError && error.errors?.length
    ? toFormChecks(error.errors.map((item) => ({ ok: false, ...item })), copy).map((item) => item.message).join(' / ')
    : error instanceof Error ? error.message : 'Error', [copy])

  // เก็บ mock ลง localStorage เฉพาะโหมด mock
  useEffect(() => {
    if (USE_DB) return
    const snapshot: MockSnapshot = { policy, documents, employees, notifications, mockRole, emailEnabled, ledgerEmployeeId, savedSignature }
    try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(snapshot)) } catch (error) { console.warn('Could not save mock leave data', error) }
  }, [policy, documents, employees, notifications, mockRole, emailEnabled, ledgerEmployeeId, savedSignature])

  const selectedDocument = USE_DB ? detail?.doc ?? null : documents.find((doc) => doc.id === selectedDocumentId) ?? null
  // โหมด DB: dialog ลายเซ็นเปิดเฉพาะเมื่อผู้ใช้กดปุ่มเซ็นเอง (signingDocumentId ตั้งเอง) ไม่ fallback ไป detail — ไม่งั้น dialog จะเด้งทับ popup รายละเอียด
  const signingDocument = signingDocumentId === null ? null : documents.find((doc) => doc.id === signingDocumentId) ?? detail?.doc ?? null
  const detailValues = selectedDocument?.formData ?? {}
  const currentSubmitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
  const currentSubmitterName = USE_DB ? ((user as unknown as { name?: string } | null)?.name ?? '') : currentSubmitter.name
  const canCancel = mockRole === 'พนักงาน'
  const formChecks = USE_DB ? serverChecks : selectedKind ? validateSubmission(selectedKind, { ...formValues }, documents, currentSubmitter, policy, copy) : []
  const certificateRequired = formChecks.some((check) => !check.ok && check.key === 'certificateRequired')
  // โหมด DB: ผู้ยื่นเซ็นตอนส่งเอกสารแล้ว จึงไม่มีขั้น "เซ็นภายหลัง"
  const canSignAsSubmitter = (doc: MockDocument) => !USE_DB && mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี' && doc.status.startsWith('pending') && !doc.signatures?.['ผู้ยื่น']
  // โหมด DB: ถ้าอยู่ในหน้ารายละเอียด ให้ปุ่มเซ็นเปิด dialog ทับ popup รายละเอียดได้ตั้งใจ — แต่ต้องตั้ง signingDocumentId เองเท่านั้น
  const signatureStage = (doc: MockDocument): SignatureStage => canSignAsSubmitter(doc) ? 'ผู้ยื่น' : doc.status === 'pending_mgr' ? 'ผู้จัดการแผนก' : doc.status === 'pending_exec' ? 'ผู้ประกอบการ' : 'HR'

  // ---------- โหลดข้อมูลจาก API ----------
  const reload = useCallback(async () => {
    if (!USE_DB) return
    setDocsLoading(true); setDocsError('')
    try {
      // หน้าเอกสารรายบุคคล (view 'all'): ปุ่มสลับ "ของตัวเอง" / "ที่เกี่ยวข้อง" — mine=me ให้ server กรองเฉพาะเอกสารของผู้ใช้
      const rows = await listRequests(view === 'pending' ? { awaiting: 'me' } : view === 'all' && scope === 'mine' ? { mine: 'me' } : {})
      setDocuments(rows.filter((row) => row.status !== 'cancelled').map((row) => mapListRow(row, mapperText)))
    } catch (error) { setDocsError(errorText(error)) } finally { setDocsLoading(false) }
  }, [view, scope, mapperText, errorText])

  useEffect(() => { if (USE_DB && ['all', 'pending', 'ledger'].includes(view)) void reload() }, [view, reload])

  // โหมด DB: แจ้งเตือนจากตาราง employee_request_notifications
  const reloadNotifications = useCallback(async () => {
    if (!USE_DB) return
    try {
      const rows = await listNotifications()
      setNotifications(rows.map((row) => ({
        id: row.notificationId,
        title: `${row.employeeName} · ${mapperText.kinds[row.kind] ?? row.requestNo}`,
        // แสดงสถานะเป็นข้อความที่อ่านได้ เช่น "ยกเลิกแล้ว" / "รอผู้จัดการแผนก" (ไม่แสดง enum ดิบ)
        body: [row.reason ?? row.otTask ?? row.place ?? '', copy.statuses[row.status as keyof typeof copy.statuses] ?? row.status].filter(Boolean).join(' · '),
        date: row.createdAt,
        read: row.isRead,
        documentId: row.id,
        event: row.event,
      })))
    } catch (error) {
      showToast(errorText(error), 'error')
    }
  }, [mapperText, errorText, showToast])
  useEffect(() => { if (USE_DB && view === 'notifications') void reloadNotifications() }, [view, reloadNotifications])

  // Topbar คลิกแจ้งเตือน → ส่ง document id มาทาง sessionStorage + custom event → เปิด popup รายละเอียดเอกสารทันที
  // (custom event สำคัญ: ถ้าอยู่หน้าเอกสารอยู่แล้ว component ไม่ re-mount effect ต้องฟัง event เอง)
  const openDocumentFromSession = () => {
    const raw = sessionStorage.getItem(OPEN_DOCUMENT_KEY)
    if (!raw) return
    sessionStorage.removeItem(OPEN_DOCUMENT_KEY)
    const id = Number(raw)
    if (Number.isSafeInteger(id) && id > 0) setSelectedDocumentId(id)
  }
  useEffect(() => {
    if (!USE_DB) return
    openDocumentFromSession()
    const handler = () => openDocumentFromSession()
    window.addEventListener('dms:open-doc', handler)
    return () => window.removeEventListener('dms:open-doc', handler)
  }, [view])

  // นโยบาย + ลายเซ็นที่จดจำไว้ + รายชื่อพนักงาน (ledger)
  useEffect(() => {
    if (!USE_DB) return
    getPolicy().then((p) => { const next: MockPolicy = { ...INITIAL_POLICY, ...p, expiry: p.expiryDate }; setPolicy(next); setPolicyDraft(next) }).catch((error) => showToast(errorText(error), 'error'))
    getMySignature().then((r) => setSavedSignature(r.signature)).catch((error) => showToast(errorText(error), 'error'))
    listPeople().then((rows) => setDbPeople(rows)).catch((error) => showToast(errorText(error), 'error'))
  }, [errorText, showToast])

  // รายละเอียดเอกสาร (ลายเซ็น, formData, canApprove/canCancel จาก server)
  useEffect(() => {
    if (!USE_DB) return
    if (selectedDocumentId === null) { setDetail(null); return }
    let cancelled = false
    getRequest(selectedDocumentId)
      .then((row) => { if (!cancelled) setDetail({ doc: mapDetail(row, mapperText), canApprove: row.canApprove, canCancel: row.canCancel, canViewMedicalCertificate: row.canViewMedicalCertificate }) })
      .catch((error) => { if (!cancelled) { showToast(errorText(error), 'error'); setSelectedDocumentId(null) } })
    return () => { cancelled = true }
  }, [selectedDocumentId, mapperText, errorText, showToast])

  // เช็คลิสต์ในฟอร์มจาก server (debounce 300ms)
  useEffect(() => {
    if (!USE_DB || !selectedKind) {
      setServerChecks([])
      setValidatingForm(false)
      return
    }
    let cancelled = false
    setServerChecks([])
    setValidatingForm(true)
    const timer = window.setTimeout(() => {
      validateRequestDryRun(selectedKind, formValues)
        .then((r) => { if (!cancelled) setServerChecks(toFormChecks(r.checks, copy)) })
        .catch((error: unknown) => { if (!cancelled) setServerChecks([{ ok: false, message: errorText(error) }]) })
        .finally(() => { if (!cancelled) setValidatingForm(false) })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [selectedKind, formValues, copy, errorText])

  useEffect(() => {
    const canvas = signatureCanvas.current
    if (!canvas || (signingDocumentId === null && !pendingSubmission)) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureHasInk(false)
    setSignatureEdited(false)
    if (!savedSignature) return
    let cancelled = false
    const image = new Image()
    signaturePreviewImage.current = image
    image.onload = () => {
      if (cancelled || signaturePreviewImage.current !== image) return
      // วาดลายเซ็นที่จดจำไว้โดยรักษาสัดส่วน (ไม่ยืดเต็ม canvas ทำให้ลายเซ็นใหญ่เกิน)
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height, 1)
      const width = image.width * scale, height = image.height * scale
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, (canvas.width - width) / 2, canvas.height - height, width, height)
      setSignatureHasInk(true)
    }
    image.src = savedSignature
    return () => {
      cancelled = true
      image.onload = null
      if (signaturePreviewImage.current === image) signaturePreviewImage.current = null
    }
  }, [signingDocumentId, pendingSubmission, savedSignature])

  const pageTitle = view === 'pending' ? copy.pendingTitle : view === 'ledger' ? copy.ledgerTitle : view === 'employees' ? copy.employeesTitle : view === 'policy' ? copy.policyTitle : view === 'flowRules' ? copy.flowRulesTitle : view === 'notifications' ? copy.notificationsTitle : copy.allTitle
  const visibleDocs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('th')
    return documents.filter((doc) => {
      // โหมด DB: server กรองสิทธิ์การมองเห็นและกรองหน้า pending (awaiting=me) ให้แล้ว
      const roleMatches = USE_DB || view === 'pending' || mockRole === 'HR'
        || (mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี')
        || (mockRole === 'ผู้จัดการแผนก' && doc.department === 'การตลาด')
      const statusMatches = USE_DB && view === 'pending'
        ? true
        : view === 'pending' ? doc.status === 'pending_hr' && doc.employee !== 'ศิริพร แก้วมณี' : statusFilter === 'all' || (statusFilter === 'pending' ? doc.status.startsWith('pending') : doc.status === statusFilter)
      const group = KIND_INFO[doc.kind].group
      const kindMatches = kindFilter === 'all' || group === kindFilter || doc.kind === kindFilter
      const searchMatches = !query || [doc.no, doc.title, doc.summary, doc.employee, doc.department].some((field) => field.toLocaleLowerCase('th').includes(query))
      const departmentMatches = departmentFilter === 'all' || doc.department === departmentFilter
      const employeeMatches = employeeFilter === 'all' || doc.employee === employeeFilter
      return roleMatches && statusMatches && kindMatches && searchMatches && departmentMatches && employeeMatches
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, kindFilter, mockRole, search, statusFilter, view, copy, departmentFilter, employeeFilter])
  // ตัวเลือกแผนก: โหมด DB ใช้แผนกทั้งหมดของบริษัท (เหมือน "ทุกสถานะ" ที่เป็นตัวเลือกคงที่) ไม่จำกัดเฉพาะแผนกที่มีเอกสารแล้ว
  const [allDepartments, setAllDepartments] = useState<string[]>([])
  useEffect(() => {
    if (!USE_DB) return
    let cancelled = false
    listDepartments()
      .then((response) => { if (!cancelled) setAllDepartments(response.data.filter((department) => Boolean(department.isActive) && department.companyId === user?.company?.id).map((department) => department.name).sort()) })
      .catch(() => { /* โหลดไม่สำเร็จ → fallback ใช้แผนกจากเอกสารที่มีอยู่ */ })
    return () => { cancelled = true }
  }, [user?.company?.id])
  const departmentOptions = useMemo(
    () => Array.from(new Set([...allDepartments, ...documents.map((doc) => doc.department).filter(Boolean)])).sort(),
    [allDepartments, documents],
  )
  // ตัวเลือกผู้ยื่น: จากเอกสารที่มองเห็น
  const employeeOptions = useMemo(() => Array.from(new Set(documents.map((doc) => doc.employee).filter(Boolean))).sort(), [documents])

  // แบ่งหน้า (เหมือนหน้าจอ survey): ทั้ง pending และ all ใช้ pagination
  const totalDocs = visibleDocs.length
  const totalPages = Math.max(Math.ceil(totalDocs / pageSize), 1)
  const pageSafe = Math.max(1, Math.min(page, totalPages))
  const pagedDocs = visibleDocs.slice((pageSafe - 1) * pageSize, pageSafe * pageSize)
  const resetPage = () => setPage(1)

  // สมุดบันทึกการลา: โหมด DB แสดงของตัวเองเป็นค่าเริ่มต้น (ถ้าอยู่ในรายชื่อ) — ถ้าจะดูของคนอื่นค่อยเลือกจาก dropdown
  useEffect(() => {
    if (!USE_DB || dbPeople.length === 0) return
    const mine = dbPeople.find((person) => person.id === user?.id)
    if (mine && String(mine.id) !== ledgerEmployeeId) setLedgerEmployeeId(String(mine.id))
  }, [dbPeople, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const availableLedgerEmployees = USE_DB
    ? dbPeople.map((person) => ({
        id: String(person.id), name: person.name, code: person.employeeCode ?? '', department: person.departmentName ?? '',
        sick: person.sick, personal: person.personal, vacation: person.vacation, other: person.other, active: person.isActive,
        role: 'พนักงาน' as const, email: person.email, emailNotify: Boolean(person.emailNotificationsEnabled),
        startDate: person.startDate ?? '', appointedDate: person.appointedDate ?? '',
      }))
    : mockRole === 'HR' ? employees : mockRole === 'ผู้จัดการแผนก' ? employees.filter((employee) => employee.id === 'e2') : employees.filter((employee) => employee.id === 'e1')
  const ledgerEmployee = availableLedgerEmployees.find((employee) => employee.id === ledgerEmployeeId) ?? availableLedgerEmployees[0] ?? employees[0]
  // สมุดบันทึกการลา: แสดงเฉพาะรายการที่ยังไม่ถูกปฏิเสธ (ปฏิเสธแล้วต้องไม่ค้างในสมุด)
  const ledgerRows = documents.filter((doc) => doc.kind === 'leave' && doc.status !== 'rejected' && (!USE_DB || doc.employee === ledgerEmployee.name)).sort((left, right) => (left.from ?? '').localeCompare(right.from ?? ''))
  // ชื่อบริษัทเต็มบนหัวกระดาษสมุดบันทึกการลา — อิงบริษัทของผู้ใช้ + ภาษาที่เลือก
  const COMPANY_FULL_NAMES: Record<string, Record<'th' | 'en', string>> = {
    boswell: { th: 'บริษัท บอสเวลล์ คอนเนคชั่น กรุ๊ป จำกัด', en: 'Boswell Connection Group Co., Ltd.' },
    'big money': { th: 'บริษัท บิ๊ก มันนี่ พลัส จำกัด', en: 'Big Money Plus Co., Ltd' },
    'boswell digital': { th: 'บริษัท บอสเวลล์ ดิจิทัล โฮลดิ้ง จำกัด', en: 'Boswell Digital Holding Co., Ltd' },
  }
  const companyKey = Object.keys(COMPANY_FULL_NAMES).find((key) => (user?.company?.name ?? '').trim().toLowerCase().includes(key))
  const ledgerCompanyName = companyKey ? COMPANY_FULL_NAMES[companyKey][language] : user?.company?.name

  useEffect(() => {
    if (view !== 'employees') return
    let cancelled = false
    const loadEmployees = async () => {
      setDbEmployeesLoading(true)
      setDbEmployeesError('')
      try {
        const firstPage = await listUsers({ status: 'all', page: 1, limit: 100 })
        const pages = await Promise.all(Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) => listUsers({ status: 'all', page: index + 2, limit: 100 })))
        const rows = [
          ...firstPage.data,
          ...pages.flatMap((page) => page.data),
        ].filter((employee) => !user?.company?.id || employee.companyId === user.company.id)
        if (!cancelled) setDbEmployees(rows)
      } catch (error) {
        if (!cancelled) setDbEmployeesError(error instanceof Error ? error.message : copy.employees.loadError)
      } finally {
        if (!cancelled) setDbEmployeesLoading(false)
      }
    }
    void loadEmployees()
    return () => { cancelled = true }
  }, [view, user?.company?.id, copy.employees.loadError])

  const submitMock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedKind) return
    if (USE_DB) {
      if (validatingForm || serverChecks.length === 0 || serverChecks.some((check) => !check.ok)) return
    } else {
      const submitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
      const checks = validateSubmission(selectedKind, { ...formValues }, documents, submitter, policy, copy)
      if (checks.some((check) => !check.ok)) return
    }
    setPendingSubmission({ kind:selectedKind, values:{ ...formValues } })
    setFormOpen(false)
    setSignatureHasInk(false)
  }

  const updateFormValue = (key: string, value: string | boolean) => {
    if (key === 'leaveType' && value !== 'sick') {
      setMedicalCertificateFile(null)
      setFormValues((current) => ({ ...current, cert: false }))
    }
    setFormValues((current) => {
      const next = { ...current, [key]:value }
      if ((selectedKind === 'leave' || selectedKind === 'outing') && (key === 'from' || key === 'to')) {
        if (next.from && !next.to) next.to = next.from
        if (next.to && !next.from) next.from = next.to
        // เลือกวัน → แสดงชั่วโมงอัตโนมัติ (1 วันทำงาน = hoursPerDay ชม.) เหมือนของเดิมที่แสดงเป็นวัน
        next.days = String(daysBetween(String(next.from ?? ''), String(next.to ?? '')) || '')
        const autoDays = Number(next.days) || 0
        next.hours = autoDays > 0 ? String(autoDays * policy.hoursPerDay) : ''
      }
      if (selectedKind === 'leave' && next.leaveType === 'emergency' && next.byHour === true) {
        next.to = next.from ?? ''
        const duration = (timeMinutes(String(next.end ?? '')) - timeMinutes(String(next.start ?? ''))) / 60
        next.hours = duration > 0 ? String(Math.ceil(duration / policy.hourStep) * policy.hourStep) : ''
        next.days = duration > 0 ? String(Math.ceil(duration / policy.hourStep) * policy.hourStep / policy.hoursPerDay) : ''
      }
      // พิมพ์จำนวนชั่วโมงตรง ๆ ได้เลย (ทุกประเภทการลา) — ระบบคำนวณเป็นวันให้เอง
      if (selectedKind === 'leave' && key === 'hours') {
        const typed = Number(String(value).trim())
        if (Number.isFinite(typed) && typed > 0) {
          const rounded = Math.ceil(typed / policy.hourStep) * policy.hourStep
          next.byHour = true
          next.hours = String(rounded)
          next.days = String(rounded / policy.hoursPerDay)
          next.to = next.from ?? ''
        } else {
          next.byHour = false
          next.days = String(daysBetween(String(next.from ?? ''), String(next.to ?? '')) || '')
        }
      }
      if (selectedKind === 'ot' && (key === 'start' || key === 'end')) {
        const hours = (timeMinutes(String(next.end ?? '')) - timeMinutes(String(next.start ?? ''))) / 60
        next.hours = hours > 0 ? String(Math.round(hours * 2) / 2) : ''
      }
      return next
    })
  }

  const updateMedicalCertificate = (file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) {
      setMedicalCertificateFile(null)
      setFormValues((current) => ({ ...current, cert: false }))
      showToast(copy.submission.medicalCertificateTooLarge, 'error')
      return
    }
    setMedicalCertificateFile(file)
    setFormValues((current) => ({ ...current, cert: Boolean(file) }))
  }

  const cancelPendingSubmission = () => { setPendingSubmission(null); setFormOpen(true) }

  const mockDecision = (doc: MockDocument, reject = false, signature?: string, note = '') => {
    const nextStatus: Status = reject ? 'rejected' : doc.status === 'pending_mgr' || doc.status === 'pending_exec' ? 'pending_hr' : 'approved'
    const stage: SignatureStage = doc.status === 'pending_mgr' ? 'ผู้จัดการแผนก' : doc.status === 'pending_exec' ? 'ผู้ประกอบการ' : 'HR'
    const reviewer = stage === 'HR' ? employees.find((employee) => employee.role === 'HR') : employees.find((employee) => employee.role === mockRole)
    setDocuments((current) => current.map((item) => item.id === doc.id ? { ...item, status:nextStatus, ...(reject ? { note, rejectedBy:stage === 'ผู้จัดการแผนก' ? 'manager' as const : 'hr' as const } : {}), ...(signature ? { signatures: { ...item.signatures, [stage]: { image:signature, name:reviewer?.name ?? mockRole, date:new Date().toISOString().slice(0,10) } } } : {}) } : item))
    showToast(reject ? copy.messages.rejectedToast : doc.status === 'pending_mgr' ? copy.messages.forwardedToast : copy.messages.approvedToast, 'success')
  }

  // ---------- ไม่อนุมัติ / ยกเลิก ----------
  const rejectDocument = async (note: string) => {
    const doc = rejectTarget
    if (!doc || rejectSubmitting) return
    setRejectSubmitting(true)
    try {
      if (USE_DB) await rejectRequest(doc.id, note)
      else mockDecision(doc, true, undefined, note)
      setRejectTarget(null)
      setSelectedDocumentId(null)
      if (USE_DB) showToast(copy.messages.rejectedToast, 'success')
      await reload()
    } catch (error) { showToast(errorText(error), 'error') }
    finally { setRejectSubmitting(false) }
  }
  const cancelDocument = async () => {
    const id = cancelTargetId
    if (id === null || cancelSubmitting) return
    setCancelSubmitting(true)
    try {
      if (USE_DB) await cancelRequest(id)
      else setDocuments((current) => current.filter((doc) => doc.id !== id))
      setCancelTargetId(null)
      setSelectedDocumentId(null)
      showToast(copy.messages.cancelledToast, 'success')
      if (USE_DB) await reload()
    } catch (error) { showToast(errorText(error), 'error') }
    finally { setCancelSubmitting(false) }
  }

  const signaturePoint = (event: PointerEventType<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return { x:(event.clientX - rect.left) * canvas.width / rect.width, y:(event.clientY - rect.top) * canvas.height / rect.height }
  }
  const startSignature = (event: PointerEventType<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = event.currentTarget
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.setPointerCapture(event.pointerId)
    const point = signaturePoint(event)
    context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x + .1, point.y + .1)
    context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#172554'; context.stroke()
    signatureDrawing.current = true; setSignatureHasInk(true); setSignatureEdited(true)
  }
  const drawSignature = (event: PointerEventType<HTMLCanvasElement>) => {
    if (!signatureDrawing.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const point = signaturePoint(event); context.lineTo(point.x, point.y); context.stroke()
  }
  const finishSignature = () => { signatureDrawing.current = false }
  const clearSignature = () => {
    const canvas = signatureCanvas.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    if (signaturePreviewImage.current) {
      signaturePreviewImage.current.onload = null
      signaturePreviewImage.current = null
    }
    signatureDrawing.current = false
    setSignatureHasInk(false)
    setSignatureEdited(true)
  }
  const confirmSignature = async () => {
    if (!signingDocument && !pendingSubmission) return
    // เซ็นหรือไม่เซ็นก็ได้ — ไม่เซ็นส่ง image ว่างไป (server บันทึกเป็น null = ยืนยันโดยไม่เซ็น)
    const image = signatureHasInk
      ? !signatureEdited && savedSignature ? savedSignature : signatureCanvas.current?.toDataURL('image/png') ?? ''
      : ''

    if (USE_DB) {
      try {
        if (pendingSubmission) {
          await createRequest(
            { kind: pendingSubmission.kind, values: pendingSubmission.values, signature: image, rememberSignature },
            medicalCertificateFile ?? undefined,
          )
          setPendingSubmission(null); setSelectedKind(''); setFormValues({})
          setMedicalCertificateFile(null)
          showToast(copy.messages.submittedToast, 'success')
        } else if (signingDocument) {
          const result = await approveRequest(signingDocument.id, { signature: image, rememberSignature })
          setSigningDocumentId(null); setSelectedDocumentId(null)
          showToast(result.status === 'pending_hr' || result.status === 'pending_exec' ? copy.messages.forwardedToast : copy.messages.approvedToast, 'success')
        }
        if (rememberSignature && image) setSavedSignature(image)
        await reload()
      } catch (error) { showToast(errorText(error), 'error') }
      return
    }

    if (pendingSubmission) {
      const { kind, values } = pendingSubmission
      const submitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
      const nextId = Math.max(...documents.map((doc) => doc.id), 0) + 1
      const value = (key: string) => String(values[key] ?? '')
      const date = new Date().toISOString().slice(0,10)
      const leaveLabel = LEAVE_TYPES[value('leaveType')] ?? KIND_INFO[kind].title
      const leaveHours = Number(value('days')) * policy.hoursPerDay
      const title = kind === 'leave' ? `${leaveLabel} · ${leaveHours ? `${leaveHours} ชั่วโมง` : ''}`.replace(' · ', leaveHours ? ' · ' : '') || leaveLabel : kind === 'ot' ? `ทำ OT · ${value('hours')} ชั่วโมง` : KIND_INFO[kind].title
      const summary = kind === 'leave' ? `${dateText(value('from'))}${value('to') && value('to') !== value('from') ? ` – ${dateText(value('to'))}` : ''} · ${value('reason')}` : kind === 'ot' ? `${dateText(value('date'))} · ${value('start')}–${value('end')} · ${value('task')}` : kind === 'timefix' ? `${dateText(value('date'))} · ${value('reason')}` : kind === 'outing' ? `${dateText(value('from'))} – ${dateText(value('to'))} · ${value('company')} · ${value('address')}` : `${dateText(value('date'))} · ${value('reason')}`
      const doc: MockDocument = { id:nextId, no:`MOCK-2569-${String(nextId).padStart(4,'0')}`, kind, title, summary, employee:submitter.name, department:submitter.department, date, status:mockRole === 'พนักงาน' ? 'pending_mgr' : 'pending_hr', from:value(kind === 'leave' || kind === 'outing' ? 'from' : 'date'), to:value(kind === 'leave' || kind === 'outing' ? 'to' : 'date'), days:Number(value('days')) || undefined, reason:value('reason'), leaveType:kind === 'leave' ? value('leaveType') as MockDocument['leaveType'] : undefined, medicalCertificateAvailable:Boolean(medicalCertificateFile), formData:values, signatures: image ? { 'ผู้ยื่น':{ image, name:submitter.name, date } } : undefined }
      setDocuments((current) => [doc, ...current])
      if (rememberSignature && image) setSavedSignature(image)
      setPendingSubmission(null); setSelectedKind(''); setFormValues({})
      setMedicalCertificateFile(null)
      showToast(copy.messages.submittedToast, 'success')
      return
    }
    if (!signingDocument) return
    if (canSignAsSubmitter(signingDocument)) {
      setDocuments((current) => current.map((doc) => doc.id === signingDocument.id ? { ...doc, signatures:{ ...doc.signatures, 'ผู้ยื่น':{ image, name:doc.employee, date:new Date().toISOString().slice(0,10) } } } : doc))
      showToast(copy.messages.signedToast, 'success')
    } else {
      mockDecision(signingDocument, false, image)
    }
    if (rememberSignature && image) setSavedSignature(image)
    setSigningDocumentId(null)
  }

  // ---------- นโยบาย ----------
  const savePolicyDraft = async () => {
    if (!policyDraft.yearStart || !policyDraft.yearEnd || policyDraft.yearEnd < policyDraft.yearStart) { showToast(copy.messages.policyInvalid, 'error'); return }
    if (!USE_DB) { setPolicy({ ...policyDraft }); showToast(copy.messages.policySaved, 'success'); return }
    try {
      const saved = await savePolicy({
        year: policyDraft.year, yearStart: policyDraft.yearStart, yearEnd: policyDraft.yearEnd,
        leadPersonal: policyDraft.leadPersonal, leadVacation: policyDraft.leadVacation,
        hoursPerDay: policyDraft.hoursPerDay, hourStep: policyDraft.hourStep,
        certDays: policyDraft.certDays, otMax: policyDraft.otMax, fixDays: policyDraft.fixDays,
      })
      const next: MockPolicy = { ...INITIAL_POLICY, ...saved, expiry: saved.expiryDate }
      setPolicy(next); setPolicyDraft(next)
      showToast(copy.messages.policySaved, 'success')
    } catch (error) { showToast(errorText(error), 'error') }
  }
  const resetPolicyAndMock = () => {
    if (USE_DB) { setPolicyDraft({ ...policy }); return } // โหมด DB: คืนค่าที่บันทึกล่าสุด ไม่ล้างข้อมูลจริง
    setPolicy({ ...INITIAL_POLICY }); setPolicyDraft({ ...INITIAL_POLICY }); setDocuments(INITIAL_DOCS); setEmployees(INITIAL_EMPLOYEES); setNotifications(INITIAL_NOTIFICATIONS)
    setMockRole('พนักงาน'); setLedgerEmployeeId('e1'); setEmailEnabled(true); setSavedSignature(''); showToast(copy.messages.resetDone, 'success')
  }

  const markAllRead = () => {
    if (USE_DB) {
      markNotificationsRead()
        .then(() => reloadNotifications())
        .then(() => showToast(copy.notifications.readAll, 'success'))
        .catch((error) => showToast(errorText(error), 'error'))
      return
    }
    setNotifications((current) => current.map((notification) => ({ ...notification, read:true })))
    showToast(copy.notifications.readAll, 'success')
  }
  return <section className="feature-page feature-page--wide documents-page">
    <p className={view === 'ledger' ? 'dms-kicker' : 'feature-kicker'}>{view === 'pending' ? copy.pendingTitle : copy.section}</p>
    {view === 'ledger' ? <div className="dms-title-row documents-ledger-title"><div className="dms-title-block"><h1>{pageTitle}</h1><div className="dms-subtitle">{copy.ledgerSubtitle}</div></div></div> : view !== 'employees' && <div className="documents-heading"><div><h1>{pageTitle}</h1><span>{view === 'pending' ? copy.pendingSubtitle : view === 'policy' ? copy.policySubtitle : view === 'flowRules' ? copy.flowRulesSubtitle : view === 'notifications' ? copy.notificationsSubtitle : copy.allSubtitle}</span></div>{view === 'all' && <button className="documents-primary" onClick={() => setFormOpen(true)}><FaPlus /> {copy.submitNew}</button>}</div>}
    {view === 'ledger' && <LeaveLedger person={ledgerEmployee} people={availableLedgerEmployees} entries={ledgerRows.map((entry) => ({ ...entry, leaveType: entry.leaveType === 'emergency' ? 'vacation' : ['personal','sick','vacation','unpaid','other'].includes(String(entry.leaveType)) ? entry.leaveType as LedgerEntry['leaveType'] : 'other' }))} onPersonChange={setLedgerEmployeeId} companyName={ledgerCompanyName} hoursPerDay={policy.hoursPerDay} copy={copy} />}

    {view === 'employees' && <DocDatabaseEmployeesPanel users={dbEmployees} leaveBalances={dbPeople} hoursPerDay={policy.hoursPerDay} title={pageTitle} subtitle={copy.employeesSubtitle} companyId={user?.company?.id ?? 0} companyName={user?.company?.name ?? ''} loading={dbEmployeesLoading} error={dbEmployeesError} query={employeeQuery} onQuery={setEmployeeQuery} onUpdated={(updated) => setDbEmployees((current) => current.map((employee) => employee.id === updated.id ? updated : employee))} onCreated={(created) => setDbEmployees((current) => [created, ...current])} copy={copy} />}

    {view === 'flowRules' && <DocFlowRulesSettings
      copy={copy}
      showToast={showToast}
    />}

    {view === 'policy' && <DocLeavePolicySettings
      policyDraft={policyDraft}
      copy={copy}
      onChange={setPolicyDraft}
      onReset={resetPolicyAndMock}
      onSave={() => { void savePolicyDraft() }}
    />}

    {view === 'notifications' && <DocNotificationsPanel
      notifications={notifications} emailEnabled={emailEnabled} onEmailEnabled={setEmailEnabled} onReadAll={markAllRead}
      copy={copy}
      tab={notificationTab} onTab={setNotificationTab}
      // คลิกแจ้งเตือน: ทำเครื่องหมายว่าอ่านแล้ว แล้วเปิด popup รายละเอียดเอกสารทันที
      onOpen={(notification) => {
        const docId = notification.documentId ?? null
        if (USE_DB) void markNotificationsRead(notification.id)
          .then(() => reloadNotifications())
          .catch((error) => showToast(errorText(error), 'error'))
        else setNotifications(current => current.map(item => item.id === notification.id ? {...item,read:true} : item))
        if (docId !== null) setSelectedDocumentId(docId)
      }}
    />}

    {USE_DB && docsLoading && ['all', 'pending'].includes(view) && <p className="documents-empty">…</p>}
    {USE_DB && docsError && ['all', 'pending'].includes(view) && <p className="documents-empty" role="alert">{docsError}</p>}

    {view === 'all' && <DocAllDocumentsFilters
      search={search} onSearch={setSearch} layout={layout} onLayout={setLayout} status={statusFilter} kind={kindFilter} department={departmentFilter} employee={employeeFilter}
      draftStatus={draftStatus} draftKind={draftKind} draftDepartment={draftDepartment} draftEmployee={draftEmployee}
      onDraftStatus={setDraftStatus} onDraftKind={setDraftKind} onDraftDepartment={setDraftDepartment} onDraftEmployee={setDraftEmployee}
      departmentOptions={departmentOptions} employeeOptions={employeeOptions}
      filterOpen={filterOpen} onToggle={() => { setDraftStatus(statusFilter); setDraftKind(kindFilter); setDraftDepartment(departmentFilter); setDraftEmployee(employeeFilter); setFilterOpen(open => !open) }} count={visibleDocs.length}
      onApply={() => { setStatusFilter(draftStatus); setKindFilter(draftKind); setDepartmentFilter(draftDepartment); setEmployeeFilter(draftEmployee); setPage(1); setFilterOpen(false) }}
      scope={scope} onScope={(next) => { if (next !== scope) { setScope(next); setPage(1) } }}
      onReset={() => { setDraftStatus('all'); setDraftKind('all'); setDraftDepartment('all'); setDraftEmployee('all'); setStatusFilter('all'); setKindFilter('all'); setDepartmentFilter('all'); setEmployeeFilter('all'); setPage(1); setFilterOpen(false) }} copy={copy}
    />}

    {view === 'all' && <DocAllDocumentsList
      documents={pagedDocs} layout={layout} kindInfo={KIND_INFO} statusInfo={STATUS_INFO} dateText={dateText}
      onSelect={setSelectedDocumentId}
      onCancel={(id) => setCancelTargetId(id)}
      canCancel={USE_DB ? false : canCancel} copy={copy}
    />}
    {view === 'all' && totalDocs > 0 && <PaginationFooter
      page={pageSafe} pageSize={pageSize} total={totalDocs}
      labels={{ previous: copy.filters.previous, next: copy.filters.next, page: copy.filters.page, perPage: copy.filters.perPage }}
      onPageChange={(p: number) => setPage(Math.max(1, Math.min(p, totalPages)))}
      onPageSizeChange={(s: number) => { setPageSize(s); setPage(1) }}
    />}
    {view === 'pending' && <DocPendingApproval
      documents={pagedDocs} totalDocs={totalDocs} page={pageSafe} totalPages={totalPages} pageSize={pageSize}
      layout={layout} onLayout={setLayout} search={search} onSearch={(value) => { setSearch(value); setPage(1) }}
      onPageChange={(p) => setPage(Math.max(1, Math.min(p, totalPages)))}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} mockRole={mockRole}
      kindInfo={KIND_INFO} statusInfo={STATUS_INFO} dateText={dateText}
      onSelect={setSelectedDocumentId}
      onCancel={(id) => setCancelTargetId(id)} copy={copy}
    />}

    {selectedDocument && <DocAllDocumentsDetail
      document={selectedDocument}
      detailValues={detailValues}
      kindTitle={KIND_INFO[selectedDocument.kind].title}
      statusLabel={STATUS_INFO[selectedDocument.status]?.label ?? selectedDocument.status}
      dateText={dateText}
      copy={copy}
      canApprove={USE_DB ? Boolean(detail?.canApprove) : false}
      canCancel={USE_DB ? Boolean(detail?.canCancel) : false}
      canViewMedicalCertificate={USE_DB ? Boolean(detail?.canViewMedicalCertificate) : false}
      onClose={() => setSelectedDocumentId(null)}
      onSign={() => setSigningDocumentId(selectedDocument.id)}
      onReject={() => setRejectTarget(selectedDocument)}
      onCancel={() => setCancelTargetId(selectedDocument.id)}
    />}

    <DocRejectModal
      open={rejectTarget !== null}
      title={rejectTarget?.title ?? ''}
      subtitle={rejectTarget?.no}
      submitting={rejectSubmitting}
      onClose={() => setRejectTarget(null)}
      onConfirm={(note) => void rejectDocument(note)}
      copy={copy}
    />
    <ConfirmDialog
      open={cancelTargetId !== null}
      title={copy.messages.cancelDocumentTitle}
      description={copy.messages.cancelDocumentConfirm}
      confirmLabel={copy.messages.confirm}
      cancelLabel={copy.messages.cancel}
      loading={cancelSubmitting}
      variant="danger"
      onOpenChange={(open) => { if (!open) setCancelTargetId(null) }}
      onConfirm={() => void cancelDocument()}
    />

    {(signingDocument || pendingSubmission) && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { if (pendingSubmission) cancelPendingSubmission(); else setSigningDocumentId(null) } }}><section className="documents-modal documents-signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title"><div className="documents-modal-head"><div><h2 id="signature-modal-title">{pendingSubmission ? copy.signature.submitter : signatureStage(signingDocument!) === 'ผู้ยื่น' ? copy.signature.submitter : `${copy.signature.approve} · ${signatureStage(signingDocument!) === 'HR' ? copy.detail.hr : copy.detail.manager}`}</h2><p>{pendingSubmission ? KIND_INFO[pendingSubmission.kind].title + ' · ' + currentSubmitterName : `${copy.sampleDocuments[String(signingDocument!.id)]?.title ?? signingDocument!.title} · ${signingDocument!.employee}`}</p></div><button aria-label={copy.detail.close} onClick={() => { if (pendingSubmission) cancelPendingSubmission(); else setSigningDocumentId(null) }}><FaXmark /></button></div><div className="documents-signature-pad"><canvas ref={signatureCanvas} width={480} height={160} aria-label={copy.signature.area} onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={finishSignature} onPointerCancel={finishSignature} /></div><label className="documents-remember-signature"><input type="checkbox" checked={rememberSignature} onChange={(event) => setRememberSignature(event.target.checked)} /> {copy.signature.remember}</label><div className="documents-signature-actions"><button onClick={clearSignature}>{copy.signature.clear}</button><button className="documents-primary" onClick={() => void confirmSignature()}>{signatureHasInk ? copy.signature.confirmOrSend : copy.signature.confirmWithoutSign}</button></div></section></div>}

    <DocNewDocumentModal
      open={formOpen} selectedKind={selectedKind} kindInfo={KIND_INFO} fields={FORM_FIELDS} values={formValues} checks={formChecks} validating={validatingForm} today={todayInBangkok()} role={mockRole} copy={copy} translations={translations}
      onSubmit={submitMock}
      onClose={() => { setFormOpen(false); setSelectedKind(''); setFormValues({}); setMedicalCertificateFile(null) }}
      onClearKind={() => { setSelectedKind(''); setFormValues({}); setMedicalCertificateFile(null) }}
      onPickKind={(kind) => {
        setSelectedKind(kind)
        setMedicalCertificateFile(null)
        setFormValues((current) => kind === 'outing' && selectedKind === 'outing'
          ? current
          : Object.fromEntries(FORM_FIELDS[kind].map((field) => [field.key, field.type === 'select' ? Object.keys(field.options ?? {})[0] : field.type === 'checkbox' ? false : ''])))
      }}
      onChange={updateFormValue}
      medicalCertificateFile={medicalCertificateFile}
      certificateRequired={certificateRequired}
      onMedicalCertificateFile={updateMedicalCertificate}
    />
  </section>
}
