import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as PointerEventType } from 'react'
import { FaCalendarDays, FaClock, FaFileLines, FaHouse, FaLocationDot, FaRotate, FaPlus, FaXmark } from 'react-icons/fa6'
import type { Translations } from '../../locales'
import { LeaveLedger, type LedgerEntry } from './leave-ledger'
import './documents.css'
import DocAllDocumentsDetail from './all-documents/components/doc-alldoc-detail'
import DocAllDocumentsList from './all-documents/components/doc-alldoc-list'
import DocAllDocumentsFilters from './all-documents/components/doc-alldoc-filters'
import DocLeavePolicySettings from './leave-policy/components/doc-leave-policy-settings'
import DocEmployeesPanel from './employees/components/doc-employees-panel'
import DocNotificationsPanel from './notifications/components/doc-notifications-panel'
import DocLeaveLedgerSummary from './leave-ledger/components/doc-leave-ledger-summary'
import DocNewDocumentModal from './submission/components/doc-new-document-modal'
import DocPendingApproval from './pending-approval/components/doc-pending-approval'
import type { DocKind, FormValues, MockDocument, MockEmployee, MockNotification, MockPolicy, SignatureStage, Status } from './document-types'

type View = 'all' | 'pending' | 'ledger' | 'employees' | 'policy' | 'notifications'
type FormCheck = { ok: boolean; message: string }
const INITIAL_POLICY: MockPolicy = { year:2569, expiry:'25 พฤศจิกายน 2569', yearStart:'2025-11-26', yearEnd:'2026-11-25', leadPersonal:1, leadVacation:15, emergencyDays:3, hoursPerDay:8, hourStep:1, emergencyNeedsPersonal:true, certDays:3, otMax:4, fixDays:7 }

const KIND_INFO: Record<DocKind, { title: string; description: string; icon: typeof FaFileLines; group: 'leave' | 'ot' | 'other' }> = {
  leave: { title: 'ใบลา', description: 'ลาป่วย ลากิจ พักร้อน ลาคลอด และอื่น ๆ', icon: FaCalendarDays, group: 'leave' },
  ot: { title: 'ขอทำงานล่วงเวลา (OT)', description: 'ขออนุมัติวันและเวลาทำงานล่วงเวลา', icon: FaClock, group: 'ot' },
  timefix: { title: 'ขอแก้ไขเวลาเข้า–ออกงาน', description: 'แจ้งลืมสแกนหรือแก้ไขเวลาเข้างาน', icon: FaFileLines, group: 'other' },
  wfh: { title: 'ขอทำงานนอกสถานที่ / WFH', description: 'แจ้งสถานที่และแผนงานในวันที่ทำงาน', icon: FaHouse, group: 'other' },
  outing: { title: 'ขอออกนอกสถานที่', description: 'ขออนุญาตออกไปปฏิบัติงานระหว่างวัน', icon: FaLocationDot, group: 'other' },
  swap: { title: 'ขอสลับวันหยุด / วันทำงาน', description: 'ขอหยุดและระบุวันที่มาทำงานชดเชย', icon: FaRotate, group: 'other' },
}
const LEAVE_TYPES: Record<string, string> = { personal:'ลากิจ', sick:'ลาป่วย', vacation:'ลาพักร้อน', emergency:'ลาพักร้อนฉุกเฉิน', unpaid:'ลากิจไม่รับค่าจ้าง', maternity:'ลาคลอด', ordain:'ลาบวช', marriage:'ลาสมรส', other:'ลาอื่น ๆ' }
const FORM_FIELDS: Record<DocKind, Array<{ key: string; label: string; type: 'text' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'checkbox'; options?: Record<string, string>; step?: number; wide?: boolean }>> = {
  leave:[{key:'leaveType',label:'ประเภทการลา',type:'select',options:LEAVE_TYPES,wide:true},{key:'byHour',label:'ลาเป็นชั่วโมง (ลาพักร้อนฉุกเฉินเท่านั้น · 1 วัน = 8 ชม.)',type:'checkbox',wide:true},{key:'from',label:'วันที่ลา',type:'date'},{key:'to',label:'ถึงวันที่',type:'date'},{key:'start',label:'เวลาเริ่มลา',type:'time'},{key:'end',label:'เวลาสิ้นสุดลา',type:'time'},{key:'days',label:'จำนวนวันทำงาน (แก้ไขได้ เช่น 0.5)',type:'number',step:.5,wide:true},{key:'hours',label:'รวมชั่วโมง (คำนวณอัตโนมัติ)',type:'number',step:.5,wide:true},{key:'reason',label:'เหตุผลการลา',type:'textarea',wide:true},{key:'cert',label:'แนบใบรับรองแพทย์แล้ว',type:'checkbox',wide:true}],
  ot:[{key:'dayType',label:'ประเภทวัน',type:'select',options:{weekday:'วันทำงานปกติ',weekend:'วันหยุดประจำสัปดาห์',holiday:'วันหยุดนักขัตฤกษ์'},wide:true},{key:'date',label:'วันที่ทำ OT',type:'date',wide:true},{key:'start',label:'เวลาเริ่ม',type:'time'},{key:'end',label:'เวลาสิ้นสุด',type:'time'},{key:'hours',label:'รวม (ชั่วโมง)',type:'number',step:.5,wide:true},{key:'task',label:'งาน / โครงการที่ทำ',type:'text',wide:true},{key:'reason',label:'เหตุผลที่ต้องทำ OT',type:'textarea',wide:true}],
  timefix:[{key:'date',label:'วันที่ต้องการแก้ไข',type:'date'},{key:'cause',label:'สาเหตุ',type:'select',options:{forgot:'ลืมสแกนนิ้ว',device:'เครื่องสแกนขัดข้อง',offsite:'ปฏิบัติงานนอกสถานที่',other:'อื่น ๆ'}},{key:'inTime',label:'เวลาเข้างานที่ถูกต้อง',type:'time'},{key:'outTime',label:'เวลาออกงานที่ถูกต้อง',type:'time'},{key:'reason',label:'รายละเอียด',type:'textarea',wide:true}],
  wfh:[{key:'from',label:'ตั้งแต่วันที่',type:'date'},{key:'to',label:'ถึงวันที่',type:'date'},{key:'days',label:'จำนวนวันทำงาน',type:'number',step:.5,wide:true},{key:'place',label:'สถานที่ทำงาน',type:'text',wide:true},{key:'plan',label:'แผนงานที่จะทำ',type:'textarea',wide:true}],
  outing:[{key:'date',label:'วันที่',type:'date',wide:true},{key:'outTime',label:'เวลาออก',type:'time'},{key:'backTime',label:'เวลากลับโดยประมาณ',type:'time'},{key:'place',label:'สถานที่ที่ไป',type:'text',wide:true},{key:'reason',label:'วัตถุประสงค์',type:'textarea',wide:true}],
  swap:[{key:'offDate',label:'วันที่ขอหยุด',type:'date'},{key:'workDate',label:'วันที่มาทำงานแทน',type:'date'},{key:'reason',label:'เหตุผล',type:'textarea',wide:true}],
}

const daysBetween = (from: string, to: string) => {
  if (!from || !to || to < from) return 0
  let count = 0
  const date = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (date <= end) { if (date.getDay() !== 0 && date.getDay() !== 6) count += 1; date.setDate(date.getDate() + 1) }
  return count
}
const timeMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1 }
const validateSubmission = (kind: DocKind, values: FormValues, docs: MockDocument[], employee: MockEmployee, policy: MockPolicy): FormCheck[] => {
  const checks: FormCheck[] = []
  const add = (ok: boolean, message: string) => checks.push({ ok, message })
  const v = (key: string) => String(values[key] ?? '').trim()
  const today = new Date(); today.setHours(0,0,0,0)
  const todayIso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  if (kind === 'leave') {
    const type = v('leaveType'), from = v('from'), to = v('to'), qty = Number(v('days')), isHour = type === 'emergency' && values.byHour === true
    add(Boolean(from && to && to >= from), 'เลือกวันที่ลาและวันสุดท้ายให้ถูกต้อง')
    if (isHour) {
      const start = timeMinutes(v('start')), end = timeMinutes(v('end')), hours = (end - start) / 60
      add(start >= 0 && end > start, 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม')
      add(hours > 0 && hours <= policy.hoursPerDay, `ลาพักร้อนฉุกเฉินเป็นชั่วโมงได้ไม่เกิน ${policy.hoursPerDay} ชั่วโมงต่อวัน`)
      values.hours = hours > 0 ? String(Math.ceil(hours / policy.hourStep) * policy.hourStep) : ''
      values.days = hours > 0 ? String(Math.ceil(hours / policy.hourStep) * policy.hourStep / policy.hoursPerDay) : ''
    } else add(qty > 0, 'จำนวนวันต้องมากกว่า 0')
    add(Boolean(v('reason')), type === 'emergency' ? 'ระบุเหตุผลที่ต้องลาด่วน' : 'ระบุเหตุผลการลา')
    if (from && to && to >= from) {
      const overlap = docs.some((doc) => doc.employee === employee.name && doc.kind === 'leave' && doc.status !== 'rejected' && doc.from && doc.to && doc.from <= to && doc.to >= from)
      add(!overlap, 'ช่วงวันที่ซ้อนกับใบลาที่ยังดำเนินการอยู่')
    }
    const startDate = from ? new Date(`${from}T00:00:00`) : null
    const leadDays = startDate ? Math.floor((startDate.getTime() - today.getTime()) / 86400000) : 0
    const leadWorkdays = from ? daysBetween(todayIso, from) - (todayIso <= from && ![0,6].includes(today.getDay()) ? 1 : 0) : 0
    if (type === 'personal' || type === 'unpaid') add(leadDays >= policy.leadPersonal, `ลากิจและลากิจไม่รับค่าจ้างต้องยื่นล่วงหน้าอย่างน้อย ${policy.leadPersonal} วัน`)
    if (type === 'vacation') add(leadWorkdays >= policy.leadVacation, `ลาพักร้อนต้องยื่นล่วงหน้าอย่างน้อย ${policy.leadVacation} วันทำการ`)
    if (type === 'emergency') add(Boolean(from && from >= todayIso), 'ลาพักร้อนฉุกเฉินยื่นได้ตั้งแต่วันนี้เป็นต้นไป')
    if (['sick','personal','vacation','emergency'].includes(type) && from && to) add(from >= policy.yearStart && to <= policy.yearEnd, `วันลาต้องอยู่ในปีสิทธิ์ ${policy.year} (${policy.yearStart} – ${policy.yearEnd})`)
    const approvedUsage = (leaveType: string) => docs.filter((doc) => doc.employee === employee.name && doc.kind === 'leave' && doc.leaveType === leaveType && doc.status !== 'rejected').reduce((sum, doc) => sum + (doc.days ?? 0), 0)
    if (type === 'sick' || type === 'personal' || type === 'vacation') {
      const limit = type === 'sick' ? employee.sick : type === 'personal' ? employee.personal : employee.vacation
      const remaining = limit - approvedUsage(type)
      add(qty <= remaining, `${LEAVE_TYPES[type]}คงเหลือ ${Math.max(0,remaining)} วัน ขอลา ${qty || 0} วัน`)
    }
    if (type === 'emergency') {
      const personalRemaining = employee.personal - approvedUsage('personal')
      const vacationRemaining = employee.vacation - approvedUsage('vacation') - approvedUsage('emergency')
      const emergencyUsed = approvedUsage('emergency')
      if (policy.emergencyNeedsPersonal) add(personalRemaining < qty, personalRemaining < qty ? `สิทธิ์ลากิจเหลือ ${personalRemaining} วัน ไม่พอสำหรับคำขอนี้ จึงใช้พักร้อนฉุกเฉินได้` : `ลากิจเหลือ ${personalRemaining} วัน ให้ใช้ลากิจก่อน`)
      add(qty <= policy.emergencyDays - emergencyUsed, `สิทธิ์พักร้อนฉุกเฉิน ${policy.emergencyDays} วัน ใช้ไปแล้ว ${emergencyUsed} วัน`)
      add(qty <= vacationRemaining, `หักจากพักร้อนปีนี้ คงเหลือ ${vacationRemaining} วัน`)
    }
    if (type === 'sick' && from && to && to >= from) {
      const a = new Date(`${from}T00:00:00`), b = new Date(`${to}T00:00:00`)
      const needsCert = qty >= policy.certDays || [1,5].includes(a.getDay()) || [1,5].includes(b.getDay()) || daysBetween(from,to) < Math.round((b.getTime()-a.getTime())/86400000)+1
      if (needsCert) add(values.cert === true, 'กรณีนี้ต้องแนบใบรับรองแพทย์')
    }
  }
  if (kind === 'ot') {
    const start = timeMinutes(v('start')), end = timeMinutes(v('end')), hours = (end-start)/60
    add(Boolean(v('date')), 'เลือกวันที่ทำ OT'); add(start >= 0 && end > start, 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม')
    add(hours > 0 && hours <= policy.otMax, `OT ไม่เกิน ${policy.otMax} ชั่วโมงต่อวัน`)
    add(Boolean(v('task')), 'ระบุงานหรือโครงการที่ทำ'); add(Boolean(v('reason')), 'ระบุเหตุผลที่ต้องทำ OT')
    values.hours = hours > 0 ? String(Math.round(hours*2)/2) : ''
  }
  if (kind === 'timefix') { add(Boolean(v('date') && v('date') < todayIso), 'เลือกวันที่ผ่านมาแล้ว'); const ago = v('date') ? (today.getTime()-new Date(`${v('date')}T00:00:00`).getTime())/86400000 : Infinity; add(ago <= policy.fixDays, `แก้ไขย้อนหลังได้ไม่เกิน ${policy.fixDays} วัน`); add(Boolean(v('inTime') || v('outTime')), 'ระบุเวลาเข้า หรือเวลาออกอย่างน้อยหนึ่งรายการ'); add(Boolean(v('reason')), 'ระบุรายละเอียด') }
  if (kind === 'wfh') { add(Boolean(v('from') && v('to') && v('to') >= v('from')), 'เลือกช่วงวันที่ให้ถูกต้อง'); add(Number(v('days')) > 0, 'จำนวนวันต้องมากกว่า 0'); add(Boolean(v('place')), 'ระบุสถานที่ทำงาน'); add(Boolean(v('plan')), 'ระบุแผนงานที่จะทำ') }
  if (kind === 'outing') { add(Boolean(v('date') && v('date') >= todayIso), 'เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'); add(timeMinutes(v('outTime')) >= 0, 'ระบุเวลาออก'); add(!v('backTime') || timeMinutes(v('backTime')) > timeMinutes(v('outTime')), 'เวลากลับต้องหลังเวลาออก'); add(Boolean(v('place')), 'ระบุสถานที่ที่ไป'); add(Boolean(v('reason')), 'ระบุวัตถุประสงค์') }
  if (kind === 'swap') { add(Boolean(v('offDate') && v('offDate') >= todayIso), 'วันที่ขอหยุดต้องเป็นวันนี้หรืออนาคต'); add(Boolean(v('workDate') && v('workDate') !== v('offDate')), 'วันที่มาทำงานแทนต้องเป็นคนละวัน'); add(Boolean(v('reason')), 'ระบุเหตุผล') }
  return checks
}
const STATUS_INFO: Record<Status, { label: string; className: string }> = {
  pending_mgr: { label: 'รอผู้จัดการ', className: 'pending' },
  pending_hr: { label: 'รอ HR', className: 'pending' },
  approved: { label: 'อนุมัติแล้ว', className: 'approved' },
  rejected: { label: 'ไม่อนุมัติ', className: 'rejected' },
}
const INITIAL_DOCS: MockDocument[] = [
  { id: 1, no: 'LV-2569-0012', kind: 'leave', title: 'ลากิจ · 1 วัน', summary: '30 ต.ค. 2569 · ธุระส่วนตัว', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-10-10', status: 'pending_hr', leaveType:'personal', from:'2026-10-30', to:'2026-10-30', days:1, reason:'ธุระส่วนตัว' },
  { id: 2, no: 'LV-2569-0011', kind: 'leave', title: 'ลาพักร้อน · 3 วัน', summary: '18–20 พ.ย. 2569 · พักผ่อนปลายปี', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-10-12', status: 'pending_mgr', leaveType:'vacation', from:'2026-11-18', to:'2026-11-20', days:3, reason:'พักผ่อนปลายปี' },
  { id: 3, no: 'OT-2569-0008', kind: 'ot', title: 'ทำ OT · 2.5 ชั่วโมง', summary: '14 ต.ค. 2569 · ออกแบบแบนเนอร์งานอีเวนต์', employee: 'วีระ ศรีสุข', department: 'การตลาด', date: '2026-10-12', status: 'pending_mgr' },
  { id: 4, no: 'LV-2569-0010', kind: 'leave', title: 'ลาป่วย · 1 วัน', summary: '9 ต.ค. 2569 · แนบใบรับรองแพทย์', employee: 'วีระ ศรีสุข', department: 'การตลาด', date: '2026-10-12', status: 'pending_mgr', leaveType:'sick', from:'2026-10-09', to:'2026-10-09', days:1, reason:'ป่วย มีใบรับรองแพทย์' },
  { id: 5, no: 'WFH-2569-0003', kind: 'wfh', title: 'ทำงานนอกสถานที่ · 1 วัน', summary: '16 ต.ค. 2569 · ทำงานจากบ้าน', employee: 'วีระ ศรีสุข', department: 'การตลาด', date: '2026-10-11', status: 'pending_hr' },
  { id: 6, no: 'LV-2569-0009', kind: 'leave', title: 'ลาพักร้อน · 3 วัน', summary: '15–17 มิ.ย. 2569 · เดินทางกับครอบครัว', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-05-19', status: 'approved', leaveType:'vacation', from:'2026-06-15', to:'2026-06-17', days:3, reason:'เดินทางกับครอบครัว' },
  { id: 7, no: 'LV-2569-0008', kind: 'leave', title: 'ลากิจ · 1 วัน', summary: '14 ก.ย. 2569 · ธุระที่ธนาคาร', employee: 'สมชาย ใจดี', department: 'การตลาด', date: '2026-09-09', status: 'rejected', note: 'ตรงกับช่วงปิดงบ ขอเลื่อนเป็นสัปดาห์ถัดไป', leaveType:'personal', from:'2026-09-14', to:'2026-09-14', days:1, reason:'ธุระที่ธนาคาร', rejectedBy:'manager' },
  { id: 8, no: 'TF-2569-0002', kind: 'timefix', title: 'ขอแก้เวลาเข้างาน', summary: '9 ต.ค. 2569 · ลืมสแกนเข้างานตอนเช้า', employee: 'ธนากร ปัญญา', department: 'ฝ่ายขาย', date: '2026-10-12', status: 'pending_mgr' },
]
const INITIAL_EMPLOYEES: MockEmployee[] = [
  { id:'e1', name:'สมชาย ใจดี', code:'BCG-0142', department:'การตลาด', position:'นักการตลาด', email:'somchai@example.com', emailNotify:true, role:'พนักงาน', manager:'นภา วงศ์สุข', sick:30, personal:3, vacation:6, other:0, emergency:3, active:true, startDate:'2023-03-01', appointedDate:'2023-06-01' },
  { id:'e2', name:'นภา วงศ์สุข', code:'BCG-0107', department:'การตลาด', position:'ผู้จัดการแผนกการตลาด', email:'napa@example.com', emailNotify:true, role:'ผู้จัดการแผนก', manager:'—', sick:30, personal:3, vacation:10, other:0, emergency:3, active:true, startDate:'2019-08-15', appointedDate:'2019-11-15' },
  { id:'e3', name:'วีระ ศรีสุข', code:'BCG-0155', department:'การตลาด', position:'กราฟิกดีไซเนอร์', email:'weera@example.com', emailNotify:true, role:'พนักงาน', manager:'นภา วงศ์สุข', sick:30, personal:3, vacation:6, other:0, emergency:3, active:true, startDate:'2024-01-08', appointedDate:'2024-04-08' },
  { id:'e4', name:'ศิริพร แก้วมณี', code:'BCG-0021', department:'บุคคล', position:'HR Manager', email:'siriporn@example.com', emailNotify:true, role:'HR', manager:'—', sick:30, personal:3, vacation:10, other:0, emergency:3, active:true, startDate:'2018-02-01', appointedDate:'2018-05-01' },
  { id:'e5', name:'ประเสริฐ ลิ้มสกุล', code:'BCG-0098', department:'ฝ่ายขาย', position:'ผู้จัดการฝ่ายขาย', email:'prasert@example.com', emailNotify:true, role:'ผู้จัดการแผนก', manager:'—', sick:30, personal:3, vacation:10, other:0, emergency:3, active:true, startDate:'2020-06-01', appointedDate:'2020-09-01' },
  { id:'e6', name:'ธนากร ปัญญา', code:'BCG-0188', department:'ฝ่ายขาย', position:'เจ้าหน้าที่ขาย', email:'thanakorn@example.com', emailNotify:false, role:'พนักงาน', manager:'ประเสริฐ ลิ้มสกุล', sick:30, personal:3, vacation:6, other:0, emergency:3, active:true, startDate:'2025-02-03', appointedDate:'2025-05-03' },
]
const INITIAL_NOTIFICATIONS: MockNotification[] = [
  { id:1, title:'ใบ OT ของวีระ ศรีสุข รอพิจารณา', body:'14 ต.ค. 2569 · 18:00–20:30 · 2.5 ชั่วโมง', date:'2026-10-12T09:00:00+07:00', read:false, documentId:3 },
  { id:2, title:'ใบลาของสมชาย ใจดี รอ HR ตรวจ', body:'ลากิจ 30 ต.ค. 2569 · 1 วัน', date:'2026-10-12T10:00:00+07:00', read:false, documentId:1 },
  { id:3, title:'ผู้จัดการอนุมัติใบลาของคุณแล้ว', body:'เอกสารส่งต่อให้ HR ตรวจแล้ว', date:'2026-10-11T15:00:00+07:00', read:true, documentId:1 },
]
const COMPANY_NAME = 'บริษัท บอสเวลล์ คอนเนคชั่น กรุ๊ป จำกัด'
const LEAVE_EXPIRY = '25 พฤศจิกายน 2569'
const LEAVE_NOTES = [
  '1. การลาป่วยต้องเขียนใบลาทันทีที่กลับมาทำงาน ลาป่วยวันแรกและวันสุดท้ายของสัปดาห์ วันคร่อมวันหยุดต่อเนื่อง หรือลาป่วย 3 วันทำงานขึ้นไป ต้องแสดงใบรับรองแพทย์ทุกครั้ง',
  '2. การลากิจหรือลากิจไม่รับค่าจ้างต้องเขียนใบลาล่วงหน้าไม่น้อยกว่า 1 วัน และได้รับอนุมัติจากผู้บังคับบัญชาก่อนทุกครั้ง',
  '3. การลาพักร้อนต้องเขียนใบลาล่วงหน้าไม่น้อยกว่า 15 วัน และได้รับอนุมัติจากผู้บังคับบัญชาก่อนทุกครั้ง',
  '4. ผู้ลาต้องเขียนใบลาตามระเบียบว่าด้วยการลาประเภทต่าง ๆ และเสนอให้ผู้บังคับบัญชาพิจารณาเห็นชอบก่อนส่งให้แผนกบุคคลบันทึกเวลา',
]
const MOCK_STORAGE_KEY = 'boswell-leave-v2-mock'
type MockSnapshot = { policy: MockPolicy; documents: MockDocument[]; employees: MockEmployee[]; notifications: MockNotification[]; mockRole: MockEmployee['role']; emailEnabled: boolean; ledgerEmployeeId: string; savedSignature?: string }
function readMockSnapshot(): Partial<MockSnapshot> {
  try { return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? '{}') as Partial<MockSnapshot> } catch { return {} }
}

const dateText = (value: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${value}T00:00:00`))

function DetailField({ label, value, full = false }: { label: string; value?: string | number; full?: boolean }) {
  if (value === undefined || value === '') return null
  return <div className={`dms-form-field documents-readonly-field${full ? ' dms-form-field--full' : ''}`}><span className="dms-form-label">{label}</span><div className="documents-readonly-value">{value}</div></div>
}

export default function DocumentPage({ translations: _translations, view = 'all' }: { translations: Translations; view?: View }) {
  const [policy, setPolicy] = useState<MockPolicy>(() => ({ ...INITIAL_POLICY, ...readMockSnapshot().policy }))
  const [policyDraft, setPolicyDraft] = useState<MockPolicy>(() => ({ ...INITIAL_POLICY, ...readMockSnapshot().policy }))
  const [documents, setDocuments] = useState(() => readMockSnapshot().documents ?? INITIAL_DOCS)
  const [employees, setEmployees] = useState(() => readMockSnapshot().employees ?? INITIAL_EMPLOYEES)
  const [notifications, setNotifications] = useState(() => readMockSnapshot().notifications ?? INITIAL_NOTIFICATIONS)
  const [mockRole, setMockRole] = useState<MockEmployee['role']>(() => readMockSnapshot().mockRole ?? 'พนักงาน')
  const [ledgerEmployeeId, setLedgerEmployeeId] = useState(() => readMockSnapshot().ledgerEmployeeId ?? 'e1')
  const [notificationTab, setNotificationTab] = useState<'app' | 'email'>('app')
  const [emailEnabled, setEmailEnabled] = useState(() => readMockSnapshot().emailEnabled ?? true)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<MockNotification | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
  const [signingDocumentId, setSigningDocumentId] = useState<number | null>(null)
  const [savedSignature, setSavedSignature] = useState(() => readMockSnapshot().savedSignature ?? '')
  const [signatureHasInk, setSignatureHasInk] = useState(false)
  const [rememberSignature, setRememberSignature] = useState(true)
  const signatureCanvas = useRef<HTMLCanvasElement>(null)
  const signatureDrawing = useRef(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState('all')
  const [draftKind, setDraftKind] = useState('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedKind, setSelectedKind] = useState<DocKind | ''>('')
  const [formValues, setFormValues] = useState<FormValues>({})
  const [pendingSubmission, setPendingSubmission] = useState<{ kind: DocKind; values: FormValues } | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const snapshot: MockSnapshot = { policy, documents, employees, notifications, mockRole, emailEnabled, ledgerEmployeeId, savedSignature }
    try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(snapshot)) } catch (error) { console.warn('Could not save mock leave data', error) }
  }, [policy, documents, employees, notifications, mockRole, emailEnabled, ledgerEmployeeId, savedSignature])

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId) ?? null
  const signingDocument = documents.find((doc) => doc.id === signingDocumentId) ?? null
  const detailValues = selectedDocument?.formData ?? {}
  const currentSubmitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
  const formChecks = selectedKind ? validateSubmission(selectedKind, { ...formValues }, documents, currentSubmitter, policy) : []
  const canSignAsSubmitter = (doc: MockDocument) => mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี' && doc.status.startsWith('pending') && !doc.signatures?.['ผู้ยื่น']
  const signatureStage = (doc: MockDocument): SignatureStage => canSignAsSubmitter(doc) ? 'ผู้ยื่น' : doc.status === 'pending_mgr' ? 'ผู้จัดการแผนก' : 'HR'

  useEffect(() => {
    const canvas = signatureCanvas.current
    if (!canvas || (signingDocumentId === null && !pendingSubmission)) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureHasInk(false)
    if (!savedSignature) return
    const image = new Image()
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      setSignatureHasInk(true)
    }
    image.src = savedSignature
  }, [signingDocumentId, pendingSubmission, savedSignature])

  const pageTitle = view === 'pending' ? 'เอกสารที่รอ HR ตรวจ' : view === 'ledger' ? 'สมุดบันทึกการลา' : view === 'employees' ? 'รายชื่อพนักงาน' : view === 'policy' ? 'นโยบายการลา' : view === 'notifications' ? 'การแจ้งเตือน' : 'เอกสารทั้งหมด'
  const canReviewAsHr = view === 'pending' || mockRole === 'HR'
  const visibleDocs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('th')
    return documents.filter((doc) => {
      const roleMatches = view === 'pending' || mockRole === 'HR'
        || (mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี')
        || (mockRole === 'ผู้จัดการแผนก' && doc.department === 'การตลาด')
      const statusMatches = view === 'pending' ? doc.status === 'pending_hr' && doc.employee !== 'ศิริพร แก้วมณี' : statusFilter === 'all' || (statusFilter === 'pending' ? doc.status.startsWith('pending') : doc.status === statusFilter)
      const group = KIND_INFO[doc.kind].group
      const kindMatches = kindFilter === 'all' || group === kindFilter || doc.kind === kindFilter
      const searchMatches = !query || [doc.no, doc.title, doc.summary, doc.employee, doc.department].some((field) => field.toLocaleLowerCase('th').includes(query))
      return roleMatches && statusMatches && kindMatches && searchMatches
    })
  }, [documents, kindFilter, mockRole, search, statusFilter, view])

  const availableLedgerEmployees = mockRole === 'HR' ? employees : mockRole === 'ผู้จัดการแผนก' ? employees.filter((employee) => employee.id === 'e2' || employee.manager === 'นภา วงศ์สุข') : employees.filter((employee) => employee.id === 'e1')
  const ledgerEmployee = availableLedgerEmployees.find((employee) => employee.id === ledgerEmployeeId) ?? availableLedgerEmployees[0] ?? employees[0]
  const ledgerRows = documents.filter((doc) => doc.employee === ledgerEmployee.name && doc.kind === 'leave').sort((left, right) => (left.from ?? '').localeCompare(right.from ?? ''))
  const leaveUsed = (type: NonNullable<MockDocument['leaveType']>) => ledgerRows.filter((doc) => doc.leaveType === type && doc.status === 'approved').reduce((sum, doc) => sum + (doc.days ?? 0), 0)
  const ledgerDisplayRows = Array.from({ length:15 }, (_, index) => ledgerRows[index] ?? null)
  const employeeMatches = employees.filter((employee) => `${employee.name} ${employee.code} ${employee.department} ${employee.position}`.toLocaleLowerCase('th').includes(employeeQuery.toLocaleLowerCase('th')))

  const submitMock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedKind) return
    const submitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
    const checks = validateSubmission(selectedKind, { ...formValues }, documents, submitter, policy)
    if (checks.some((check) => !check.ok)) return
    setPendingSubmission({ kind:selectedKind, values:{ ...formValues } })
    setFormOpen(false)
    setSignatureHasInk(false)
  }

  const updateFormValue = (key: string, value: string | boolean) => {
    setFormValues((current) => {
      const next = { ...current, [key]:value }
      const dateRange = (next.from && next.to) ? daysBetween(String(next.from), String(next.to)) : 0
      if ((selectedKind === 'leave' || selectedKind === 'wfh') && (key === 'from' || key === 'to')) {
        if (next.from && !next.to) next.to = next.from
        if (next.to && !next.from) next.from = next.to
        next.days = String(daysBetween(String(next.from ?? ''), String(next.to ?? '')) || '')
      }
      if (selectedKind === 'leave' && next.leaveType === 'emergency' && next.byHour === true) {
        next.to = next.from ?? ''
        const duration = (timeMinutes(String(next.end ?? '')) - timeMinutes(String(next.start ?? ''))) / 60
        next.hours = duration > 0 ? String(Math.ceil(duration / policy.hourStep) * policy.hourStep) : ''
        next.days = duration > 0 ? String(Math.ceil(duration / policy.hourStep) * policy.hourStep / policy.hoursPerDay) : ''
      }
      if (selectedKind === 'ot' && (key === 'start' || key === 'end')) {
        const hours = (timeMinutes(String(next.end ?? '')) - timeMinutes(String(next.start ?? ''))) / 60
        next.hours = hours > 0 ? String(Math.round(hours * 2) / 2) : ''
      }
      if (selectedKind === 'wfh' && dateRange === 0 && next.from && next.to) next.days = '0'
      return next
    })
  }

  const cancelPendingSubmission = () => { setPendingSubmission(null); setFormOpen(true) }

  const mockDecision = (doc: MockDocument, reject = false, signature?: string) => {
    const note = reject ? window.prompt('ระบุเหตุผลที่ไม่อนุมัติ')?.trim() : ''
    if (reject && !note) return
    const nextStatus: Status = reject ? 'rejected' : doc.status === 'pending_mgr' ? 'pending_hr' : 'approved'
    const stage: SignatureStage = doc.status === 'pending_mgr' ? 'ผู้จัดการแผนก' : 'HR'
    const reviewer = stage === 'HR' ? employees.find((employee) => employee.role === 'HR') : employees.find((employee) => employee.role === mockRole)
    setDocuments((current) => current.map((item) => item.id === doc.id ? { ...item, status:nextStatus, ...(reject ? { note, rejectedBy:stage === 'ผู้จัดการแผนก' ? 'manager' as const : 'hr' as const } : {}), ...(signature ? { signatures: { ...item.signatures, [stage]: { image:signature, name:reviewer?.name ?? mockRole, date:new Date().toISOString().slice(0,10) } } } : {}) } : item))
    setToast(reject ? 'ตัวอย่าง: ไม่อนุมัติเอกสารแล้ว' : doc.status === 'pending_mgr' ? 'ตัวอย่าง: ส่งต่อให้ HR แล้ว' : 'ตัวอย่าง: อนุมัติเอกสารแล้ว')
    window.setTimeout(() => setToast(''), 3200)
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
    signatureDrawing.current = true; setSignatureHasInk(true)
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
    setSignatureHasInk(false)
  }
  const confirmSignature = () => {
    if (!signatureHasInk || (!signingDocument && !pendingSubmission)) return
    const image = signatureCanvas.current?.toDataURL('image/png')
    if (!image) return
    if (pendingSubmission) {
      const { kind, values } = pendingSubmission
      const submitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
      const nextId = Math.max(...documents.map((doc) => doc.id), 0) + 1
      const value = (key: string) => String(values[key] ?? '')
      const date = new Date().toISOString().slice(0,10)
      const leaveLabel = LEAVE_TYPES[value('leaveType')] ?? KIND_INFO[kind].title
      const title = kind === 'leave' ? `${leaveLabel} · ${value('days')} วัน` : kind === 'ot' ? `ทำ OT · ${value('hours')} ชั่วโมง` : KIND_INFO[kind].title
      const summary = kind === 'leave' ? `${dateText(value('from'))}${value('to') && value('to') !== value('from') ? ` – ${dateText(value('to'))}` : ''} · ${value('reason')}` : kind === 'ot' ? `${dateText(value('date'))} · ${value('start')}–${value('end')} · ${value('task')}` : kind === 'wfh' ? `${dateText(value('from'))} – ${dateText(value('to'))} · ${value('place')}` : kind === 'timefix' ? `${dateText(value('date'))} · ${value('reason')}` : kind === 'outing' ? `${dateText(value('date'))} · ${value('place')} · ${value('reason')}` : `${dateText(value('offDate'))} · ${value('reason')}`
      const doc: MockDocument = { id:nextId, no:`MOCK-2569-${String(nextId).padStart(4,'0')}`, kind, title, summary, employee:submitter.name, department:submitter.department, date, status:mockRole === 'พนักงาน' ? 'pending_mgr' : 'pending_hr', from:value(kind === 'leave' || kind === 'wfh' ? 'from' : 'date') || value('offDate'), to:value(kind === 'leave' || kind === 'wfh' ? 'to' : kind === 'swap' ? 'workDate' : 'date'), days:Number(value('days')) || undefined, reason:value('reason'), leaveType:kind === 'leave' ? value('leaveType') as MockDocument['leaveType'] : undefined, formData:values, signatures:{ 'ผู้ยื่น':{ image, name:submitter.name, date } } }
      setDocuments((current) => [doc, ...current])
      if (rememberSignature) setSavedSignature(image)
      setPendingSubmission(null); setSelectedKind(''); setFormValues({})
      setToast('เซ็นและยื่นเอกสารตัวอย่างแล้ว (ข้อมูล mock ไม่ได้บันทึกลงระบบ)')
      window.setTimeout(() => setToast(''), 3200)
      return
    }
    if (!signingDocument) return
    if (canSignAsSubmitter(signingDocument)) {
      setDocuments((current) => current.map((doc) => doc.id === signingDocument.id ? { ...doc, signatures:{ ...doc.signatures, 'ผู้ยื่น':{ image, name:doc.employee, date:new Date().toISOString().slice(0,10) } } } : doc))
      setToast('บันทึกลายเซ็นผู้ยื่นแล้ว')
    } else {
      mockDecision(signingDocument, false, image)
    }
    if (rememberSignature) setSavedSignature(image)
    setSigningDocumentId(null)
  }

  const saveMockEmployee = (employee: MockEmployee) => {
    setEmployees((current) => current.some((person) => person.id === employee.id) ? current.map((person) => person.id === employee.id ? employee : person) : [employee, ...current])
    setToast(employees.some((person) => person.id === employee.id) ? 'บันทึกข้อมูลพนักงานแล้ว' : 'เพิ่มพนักงานตัวอย่างแล้ว')
    window.setTimeout(() => setToast(''), 3200)
  }
  const toggleMockEmployee = (id: string) => {
    setEmployees((current) => current.map((person) => person.id === id ? { ...person, active: !person.active } : person))
    setToast('เปลี่ยนสถานะพนักงานแล้ว')
    window.setTimeout(() => setToast(''), 3200)
  }
  const markAllRead = () => setNotifications((current) => current.map((notification) => ({ ...notification, read:true })))
  const exportLedgerCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const leaveColumns = ['personal', 'sick', 'vacation', 'unpaid', 'other'] as const
    const rows = [['ลำดับ','วันที่ลา','ถึงวันที่','กิจ','ป่วย','พักร้อน','ลากิจไม่รับค่าจ้าง','อื่น ๆ','รวมเวลา','เหตุผลการลา','ผู้ขออนุมัติ','ผู้จัดการแผนก','HR'], ...ledgerDisplayRows.map((doc, index) => doc ? [index+1, doc.from ? dateText(doc.from) : '', doc.to ? dateText(doc.to) : '', ...leaveColumns.map((type) => doc.leaveType === type ? doc.days ?? '' : ''), doc.days ?? '', doc.reason ?? '', ledgerEmployee.name, doc.status === 'pending_mgr' ? '' : 'อนุมัติ', doc.status === 'approved' ? 'อนุมัติ' : doc.status === 'pending_hr' ? 'รอพิจารณา' : ''] : [index+1,'','','','','','','','','','','',''])]
    const blob = new Blob(['\ufeff' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href=url; anchor.download=`ใบลา_${ledgerEmployee.name.replace(/ /g,'_')}_2569.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  return <section className="feature-page documents-page">
    <p className={view === 'ledger' ? 'dms-kicker' : 'feature-kicker'}>{view === 'pending' ? 'รออนุมัติ' : 'Document Management'}</p>
    {view === 'ledger' ? <div className="dms-title-row documents-ledger-title"><div className="dms-title-block"><h1>{pageTitle}</h1><div className="dms-subtitle">สรุปวันลาที่อนุมัติแล้วและรายการที่อยู่ระหว่างพิจารณา</div></div></div> : <div className="documents-heading"><div><h1>{pageTitle}</h1><span>{view === 'pending' ? 'ตรวจเอกสารที่ผู้จัดการอนุมัติแล้ว เซ็นอนุมัติเพื่อบันทึกวันลาและอัปเดตสมุดบันทึก' : view === 'employees' ? 'HR เพิ่มพนักงาน กำหนดสิทธิ์วันลา ผู้จัดการ และสิทธิ์การใช้งานได้จากหน้านี้' : view === 'policy' ? 'กำหนดเงื่อนไขที่ระบบตัวอย่างใช้ตรวจเอกสารตอนพนักงานยื่น' : view === 'notifications' ? 'การแจ้งเตือนในแอปและอีเมลจำลอง' : 'ยื่นและติดตามสถานะเอกสารของพนักงาน'}</span></div>{view === 'all' && <button className="documents-primary" onClick={() => setFormOpen(true)}><FaPlus /> ยื่นเอกสารใหม่</button>}</div>}
    {view !== 'pending' && <div className="documents-mock-note">โหมดตัวอย่าง · ข้อมูลและการเปลี่ยนแปลงเก็บไว้ในหน้านี้เท่านั้น ไม่เชื่อมต่อฐานข้อมูล</div>}

    {view !== 'pending' && <div className="documents-mock-role"><span>จำลองบทบาท</span><select aria-label="จำลองบทบาทผู้ใช้" value={mockRole} onChange={(event) => setMockRole(event.target.value as MockEmployee['role'])}><option>พนักงาน</option><option>ผู้จัดการแผนก</option><option>HR</option></select></div>}

    {view === 'ledger' && <LeaveLedger person={ledgerEmployee} people={availableLedgerEmployees} entries={ledgerRows.map((entry) => ({ ...entry, leaveType: entry.leaveType === 'emergency' ? 'vacation' : ['personal','sick','vacation','unpaid','other'].includes(String(entry.leaveType)) ? entry.leaveType as LedgerEntry['leaveType'] : 'other' }))} onPersonChange={setLedgerEmployeeId} />}

    {view === 'ledger' && <DocLeaveLedgerSummary employees={employees} employee={ledgerEmployee} employeeId={ledgerEmployeeId} onEmployee={setLedgerEmployeeId} rows={ledgerRows} statusInfo={STATUS_INFO} onExport={exportLedgerCsv} />}

    {view === 'employees' && <DocEmployeesPanel employees={employees} documents={documents} policyStart={policy.yearStart} policyEnd={policy.yearEnd} matches={employeeMatches} mockRole={mockRole} query={employeeQuery} onQuery={setEmployeeQuery} onSave={saveMockEmployee} onToggleActive={toggleMockEmployee} />}

    {view === 'policy' && <DocLeavePolicySettings
      policyDraft={policyDraft}
      onChange={setPolicyDraft}
      onReset={() => { if (!window.confirm('รีเซ็ตข้อมูลตัวอย่างทั้งหมดหรือไม่?')) return; setPolicy({...INITIAL_POLICY}); setPolicyDraft({...INITIAL_POLICY}); setDocuments(INITIAL_DOCS); setEmployees(INITIAL_EMPLOYEES); setNotifications(INITIAL_NOTIFICATIONS); setMockRole('พนักงาน'); setLedgerEmployeeId('e1'); setEmailEnabled(true); setSavedSignature(''); setToast('รีเซ็ตข้อมูลตัวอย่างแล้ว') }}
      onSave={() => { if (!policyDraft.yearStart || !policyDraft.yearEnd || policyDraft.yearEnd < policyDraft.yearStart) { setToast('ปีสิทธิ์สิ้นสุดต้องอยู่หลังวันเริ่ม'); return } setPolicy({...policyDraft}); setToast('บันทึกนโยบายแล้ว') }}
    />}

    {view === 'notifications' && <DocNotificationsPanel
      notifications={notifications} emailEnabled={emailEnabled} onEmailEnabled={setEmailEnabled} onReadAll={markAllRead}
      tab={notificationTab} onTab={setNotificationTab}
      onOpen={(notification) => { setNotifications(current => current.map(item => item.id === notification.id ? {...item,read:true} : item)); setSelectedNotification(notification) }}
    />}
    {view === 'all' && <DocAllDocumentsFilters
      search={search} onSearch={setSearch} layout={layout} onLayout={setLayout} status={statusFilter} kind={kindFilter}
      draftStatus={draftStatus} draftKind={draftKind} onDraftStatus={setDraftStatus} onDraftKind={setDraftKind}
      filterOpen={filterOpen} onToggle={() => { setDraftStatus(statusFilter); setDraftKind(kindFilter); setFilterOpen(open => !open) }} count={visibleDocs.length}
      onApply={() => { setStatusFilter(draftStatus); setKindFilter(draftKind); setFilterOpen(false) }}
      onReset={() => { setDraftStatus('all'); setDraftKind('all'); setStatusFilter('all'); setKindFilter('all'); setFilterOpen(false) }}
    />}

    {view === 'all' && <DocAllDocumentsList
      documents={visibleDocs} layout={layout} mockRole={mockRole} kindInfo={KIND_INFO} statusInfo={STATUS_INFO} dateText={dateText}
      onSelect={setSelectedDocumentId} onCancel={(id) => setDocuments((current) => current.filter((doc) => doc.id !== id))}
    />}
    {view === 'pending' && <DocPendingApproval
      documents={visibleDocs} mockRole={mockRole} kindInfo={KIND_INFO} statusInfo={STATUS_INFO} dateText={dateText}
      onSelect={setSelectedDocumentId} onCancel={(id) => setDocuments((current) => current.filter((doc) => doc.id !== id))}
    />}

    {selectedDocument && <DocAllDocumentsDetail
      document={selectedDocument}
      detailValues={detailValues}
      kindTitle={KIND_INFO[selectedDocument.kind].title}
      statusLabel={STATUS_INFO[selectedDocument.status].label}
      dateText={dateText}
      canSignAsSubmitter={canSignAsSubmitter(selectedDocument)}
      canReview={canReviewAsHr}
      mockRole={mockRole}
      onClose={() => setSelectedDocumentId(null)}
      onSign={() => setSigningDocumentId(selectedDocument.id)}
      onReject={() => mockDecision(selectedDocument, true)}
      onCancel={() => { setDocuments((current) => current.filter((doc) => doc.id !== selectedDocument.id)); setSelectedDocumentId(null) }}
    />}

    {(signingDocument || pendingSubmission) && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { if (pendingSubmission) cancelPendingSubmission(); else setSigningDocumentId(null) } }}><section className="documents-modal documents-signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title"><div className="documents-modal-head"><div><h2 id="signature-modal-title">{pendingSubmission ? 'เซ็นชื่อผู้ยื่น' : signatureStage(signingDocument!) === 'ผู้ยื่น' ? 'เซ็นชื่อผู้ยื่น' : `เซ็นอนุมัติ · ${signatureStage(signingDocument!)}`}</h2><p>{pendingSubmission ? KIND_INFO[pendingSubmission.kind].title + ' · ' + currentSubmitter.name : `${signingDocument!.title} · ${signingDocument!.employee}`}</p></div><button aria-label="ปิด" onClick={() => { if (pendingSubmission) cancelPendingSubmission(); else setSigningDocumentId(null) }}><FaXmark /></button></div><div className="documents-signature-pad"><canvas ref={signatureCanvas} width={640} height={240} aria-label="พื้นที่เซ็นชื่อ ใช้นิ้วหรือเมาส์เซ็น" onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={finishSignature} onPointerCancel={finishSignature} /></div><label className="documents-remember-signature"><input type="checkbox" checked={rememberSignature} onChange={(event) => setRememberSignature(event.target.checked)} /> จำลายเซ็นนี้ไว้ใช้ครั้งถัดไป</label><div className="documents-signature-actions"><button onClick={clearSignature}>ล้างลายเซ็น</button><button className="documents-primary" disabled={!signatureHasInk} onClick={confirmSignature}>เซ็นชื่อและส่ง</button></div></section></div>}

    {selectedNotification && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedNotification(null) }}><section className="documents-modal"><div className="documents-modal-head"><div><span className="documents-pill is-pending">เอกสารที่เกี่ยวข้อง</span><h2>{selectedNotification.title}</h2><p>{selectedNotification.body}</p></div><button aria-label="ปิด" onClick={() => setSelectedNotification(null)}><FaXmark /></button></div><p>รายการ: {documents.find((doc) => doc.id === selectedNotification.documentId)?.no ?? 'ไม่พบเอกสาร'}</p><button className="documents-primary" onClick={() => setSelectedNotification(null)}>ปิด</button></section></div>}

    <DocNewDocumentModal
      open={formOpen} selectedKind={selectedKind} kindInfo={KIND_INFO} fields={FORM_FIELDS} values={formValues} checks={formChecks} role={mockRole}
      onSubmit={submitMock}
      onClose={() => { setFormOpen(false); setSelectedKind(''); setFormValues({}) }}
      onClearKind={() => { setSelectedKind(''); setFormValues({}) }}
      onPickKind={(kind) => { setSelectedKind(kind); setFormValues(Object.fromEntries(FORM_FIELDS[kind].map(field => [field.key, field.type === 'select' ? Object.keys(field.options ?? {})[0] : field.type === 'checkbox' ? false : '']))) }}
      onChange={updateFormValue}
    />
    {toast && <div className="documents-toast" role="status">{toast}</div>}
  </section>
}
