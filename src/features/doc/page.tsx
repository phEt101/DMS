import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as PointerEventType } from 'react'
import { FaCalendarDays, FaClock, FaFileLines, FaHouse, FaLocationDot, FaRotate, FaMagnifyingGlass, FaTableCellsLarge, FaList, FaPlus, FaXmark, FaPenNib, FaFilter } from 'react-icons/fa6'
import type { Translations } from '../../locales'
import { LeaveLedger } from './leave-ledger'
import './documents.css'

type View = 'all' | 'pending' | 'ledger' | 'employees' | 'notifications'
type Status = 'pending_mgr' | 'pending_hr' | 'approved' | 'rejected'
type DocKind = 'leave' | 'ot' | 'timefix' | 'wfh' | 'outing' | 'swap'
type MockSignature = { image: string; name: string; date: string }
type SignatureStage = 'ผู้ยื่น' | 'ผู้จัดการแผนก' | 'HR'
type MockDocument = { id: number; no: string; kind: DocKind; title: string; summary: string; employee: string; department: string; date: string; status: Status; note?: string; leaveType?: 'personal' | 'sick' | 'vacation' | 'unpaid' | 'other'; from?: string; to?: string; days?: number; reason?: string; rejectedBy?: 'manager' | 'hr'; signatures?: Partial<Record<SignatureStage, MockSignature>> }
type MockEmployee = { id: string; name: string; code: string; department: string; position: string; role: 'พนักงาน' | 'ผู้จัดการแผนก' | 'HR'; manager: string; sick: number; personal: number; vacation: number; active: boolean; startDate: string; appointedDate: string }
type MockNotification = { id: number; title: string; body: string; date: string; read: boolean; documentId: number }

const KIND_INFO: Record<DocKind, { title: string; description: string; icon: typeof FaFileLines; group: 'leave' | 'ot' | 'other' }> = {
  leave: { title: 'ใบลา', description: 'ลาป่วย ลากิจ พักร้อน ลาคลอด และอื่น ๆ', icon: FaCalendarDays, group: 'leave' },
  ot: { title: 'ขอทำงานล่วงเวลา (OT)', description: 'ขออนุมัติวันและเวลาทำงานล่วงเวลา', icon: FaClock, group: 'ot' },
  timefix: { title: 'ขอแก้ไขเวลาเข้า–ออกงาน', description: 'แจ้งลืมสแกนหรือแก้ไขเวลาเข้างาน', icon: FaFileLines, group: 'other' },
  wfh: { title: 'ขอทำงานนอกสถานที่ / WFH', description: 'แจ้งสถานที่และแผนงานในวันที่ทำงาน', icon: FaHouse, group: 'other' },
  outing: { title: 'ขอออกนอกสถานที่', description: 'ขออนุญาตออกไปปฏิบัติงานระหว่างวัน', icon: FaLocationDot, group: 'other' },
  swap: { title: 'ขอสลับวันหยุด / วันทำงาน', description: 'ขอหยุดและระบุวันที่มาทำงานชดเชย', icon: FaRotate, group: 'other' },
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
  { id:'e1', name:'สมชาย ใจดี', code:'BCG-0142', department:'การตลาด', position:'นักการตลาด', role:'พนักงาน', manager:'นภา วงศ์สุข', sick:30, personal:3, vacation:6, active:true, startDate:'2023-03-01', appointedDate:'2023-06-01' },
  { id:'e2', name:'นภา วงศ์สุข', code:'BCG-0107', department:'การตลาด', position:'ผู้จัดการแผนกการตลาด', role:'ผู้จัดการแผนก', manager:'—', sick:30, personal:3, vacation:10, active:true, startDate:'2019-08-15', appointedDate:'2019-11-15' },
  { id:'e3', name:'วีระ ศรีสุข', code:'BCG-0155', department:'การตลาด', position:'กราฟิกดีไซเนอร์', role:'พนักงาน', manager:'นภา วงศ์สุข', sick:30, personal:3, vacation:6, active:true, startDate:'2024-01-08', appointedDate:'2024-04-08' },
  { id:'e4', name:'ศิริพร แก้วมณี', code:'BCG-0021', department:'บุคคล', position:'HR Manager', role:'HR', manager:'—', sick:30, personal:3, vacation:10, active:true, startDate:'2018-02-01', appointedDate:'2018-05-01' },
  { id:'e5', name:'ประเสริฐ ลิ้มสกุล', code:'BCG-0098', department:'ฝ่ายขาย', position:'ผู้จัดการฝ่ายขาย', role:'ผู้จัดการแผนก', manager:'—', sick:30, personal:3, vacation:10, active:true, startDate:'2020-06-01', appointedDate:'2020-09-01' },
  { id:'e6', name:'ธนากร ปัญญา', code:'BCG-0188', department:'ฝ่ายขาย', position:'เจ้าหน้าที่ขาย', role:'พนักงาน', manager:'ประเสริฐ ลิ้มสกุล', sick:30, personal:3, vacation:6, active:true, startDate:'2025-02-03', appointedDate:'2025-05-03' },
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
type MockSnapshot = { documents: MockDocument[]; employees: MockEmployee[]; notifications: MockNotification[]; mockRole: MockEmployee['role']; emailEnabled: boolean; ledgerEmployeeId: string; savedSignature?: string }
function readMockSnapshot(): Partial<MockSnapshot> {
  try { return JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? '{}') as Partial<MockSnapshot> } catch { return {} }
}

const dateText = (value: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(`${value}T00:00:00`))

export default function DocumentPage({ translations: _translations, view = 'all' }: { translations: Translations; view?: View }) {
  const [documents, setDocuments] = useState(() => readMockSnapshot().documents ?? INITIAL_DOCS)
  const [employees, setEmployees] = useState(() => readMockSnapshot().employees ?? INITIAL_EMPLOYEES)
  const [notifications, setNotifications] = useState(() => readMockSnapshot().notifications ?? INITIAL_NOTIFICATIONS)
  const [mockRole, setMockRole] = useState<MockEmployee['role']>(() => readMockSnapshot().mockRole ?? 'พนักงาน')
  const [ledgerEmployeeId, setLedgerEmployeeId] = useState(() => readMockSnapshot().ledgerEmployeeId ?? 'e1')
  const [notificationTab, setNotificationTab] = useState<'app' | 'email'>('app')
  const [emailEnabled, setEmailEnabled] = useState(() => readMockSnapshot().emailEnabled ?? true)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [newEmployeeOpen, setNewEmployeeOpen] = useState(false)
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeCode, setNewEmployeeCode] = useState('')
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
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    const snapshot: MockSnapshot = { documents, employees, notifications, mockRole, emailEnabled, ledgerEmployeeId, savedSignature }
    try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(snapshot)) } catch (error) { console.warn('Could not save mock leave data', error) }
  }, [documents, employees, notifications, mockRole, emailEnabled, ledgerEmployeeId, savedSignature])

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId) ?? null
  const signingDocument = documents.find((doc) => doc.id === signingDocumentId) ?? null
  const canSignAsSubmitter = (doc: MockDocument) => mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี' && doc.status.startsWith('pending') && !doc.signatures?.['ผู้ยื่น']
  const signatureStage = (doc: MockDocument): SignatureStage => canSignAsSubmitter(doc) ? 'ผู้ยื่น' : doc.status === 'pending_mgr' ? 'ผู้จัดการแผนก' : 'HR'

  useEffect(() => {
    const canvas = signatureCanvas.current
    if (!canvas || signingDocumentId === null) return
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
  }, [signingDocumentId, savedSignature])

  const pageTitle = view === 'pending' ? 'เอกสารรออนุมัติ' : view === 'ledger' ? 'สมุดบันทึกการลา' : view === 'employees' ? 'รายชื่อพนักงาน' : view === 'notifications' ? 'การแจ้งเตือน' : 'เอกสารทั้งหมด'
  const visibleDocs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('th')
    return documents.filter((doc) => {
      const roleMatches = mockRole === 'HR'
        || (mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี')
        || (mockRole === 'ผู้จัดการแผนก' && doc.department === 'การตลาด')
      const statusMatches = view === 'pending' ? doc.status === 'pending_mgr' || doc.status === 'pending_hr' : statusFilter === 'all' || (statusFilter === 'pending' ? doc.status.startsWith('pending') : doc.status === statusFilter)
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
    const kind = selectedKind
    const nextId = Math.max(...documents.map((doc) => doc.id), 0) + 1
    const submitter = mockRole === 'พนักงาน' ? employees[0] : mockRole === 'ผู้จัดการแผนก' ? employees[1] : employees[3]
    setDocuments((current) => [{ id: nextId, no: `MOCK-2569-${String(nextId).padStart(4, '0')}`, kind, title: title || KIND_INFO[kind].title, summary: detail || 'ตัวอย่างรายการที่ยื่นใหม่', employee: submitter.name, department: submitter.department, date: new Date().toISOString().slice(0, 10), status: mockRole === 'ผู้จัดการแผนก' || mockRole === 'HR' ? 'pending_hr' : 'pending_mgr' }, ...current])
    setFormOpen(false); setSelectedKind(''); setTitle(''); setDetail(''); setToast('เพิ่มรายการตัวอย่างแล้ว (ข้อมูล mock ไม่ได้บันทึกลงระบบ)')
    window.setTimeout(() => setToast(''), 3200)
  }

  const mockDecision = (doc: MockDocument, reject = false, signature?: string) => {
    const note = reject ? window.prompt('ระบุเหตุผลที่ไม่อนุมัติ')?.trim() : ''
    if (reject && !note) return
    const nextStatus: Status = reject ? 'rejected' : doc.status === 'pending_mgr' ? 'pending_hr' : 'approved'
    const stage: SignatureStage = doc.status === 'pending_mgr' ? 'ผู้จัดการแผนก' : 'HR'
    const reviewer = employees.find((employee) => employee.role === mockRole)
    setDocuments((current) => current.map((item) => item.id === doc.id ? { ...item, status:nextStatus, ...(reject ? { note } : {}), ...(signature ? { signatures: { ...item.signatures, [stage]: { image:signature, name:reviewer?.name ?? mockRole, date:new Date().toISOString().slice(0,10) } } } : {}) } : item))
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
    if (!signatureHasInk || !signingDocument) return
    const image = signatureCanvas.current?.toDataURL('image/png')
    if (!image) return
    if (canSignAsSubmitter(signingDocument)) {
      setDocuments((current) => current.map((doc) => doc.id === signingDocument.id ? { ...doc, signatures:{ ...doc.signatures, 'ผู้ยื่น':{ image, name:doc.employee, date:new Date().toISOString().slice(0,10) } } } : doc))
      setToast('บันทึกลายเซ็นผู้ยื่นแล้ว')
    } else {
      mockDecision(signingDocument, false, image)
    }
    if (rememberSignature) setSavedSignature(image)
    setSigningDocumentId(null)
  }

  const addMockEmployee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newEmployeeName.trim() || !newEmployeeCode.trim()) return
    setEmployees((current) => [{ id:`mock-${Date.now()}`, name:newEmployeeName.trim(), code:newEmployeeCode.trim(), department:'บุคคล', position:'พนักงานใหม่', role:'พนักงาน', manager:'นภา วงศ์สุข', sick:30, personal:3, vacation:6, active:true, startDate:new Date().toISOString().slice(0,10), appointedDate:new Date().toISOString().slice(0,10) }, ...current])
    setNewEmployeeName(''); setNewEmployeeCode(''); setNewEmployeeOpen(false); setToast('เพิ่มพนักงานตัวอย่างแล้ว')
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
    <p className="feature-kicker">Document Management</p>
    <div className="documents-heading"><div><h1>{pageTitle}</h1><span>{view === 'ledger' ? 'สรุปวันลาที่อนุมัติแล้วและรายการที่อยู่ระหว่างพิจารณา' : view === 'employees' ? 'จัดการรายชื่อและสิทธิ์วันลาตัวอย่าง' : view === 'notifications' ? 'การแจ้งเตือนในแอปและอีเมลจำลอง' : 'ยื่นและติดตามสถานะเอกสารของพนักงาน'}</span></div>{(view === 'all' || view === 'pending') && <button className="documents-primary" onClick={() => setFormOpen(true)}><FaPlus /> ยื่นเอกสารใหม่</button>}</div>
    <div className="documents-mock-note">โหมดตัวอย่าง · ข้อมูลและการเปลี่ยนแปลงเก็บไว้ในหน้านี้เท่านั้น ไม่เชื่อมต่อฐานข้อมูล</div>

    <div className="documents-mock-role"><span>จำลองบทบาท</span><select aria-label="จำลองบทบาทผู้ใช้" value={mockRole} onChange={(event) => setMockRole(event.target.value as MockEmployee['role'])}><option>พนักงาน</option><option>ผู้จัดการแผนก</option><option>HR</option></select></div>

    {view === 'ledger' && <LeaveLedger person={ledgerEmployee} people={availableLedgerEmployees} entries={ledgerRows} onPersonChange={setLedgerEmployeeId} />}

    {view === 'ledger' && <><div className="documents-ledger-summary"><label>เลือกพนักงาน<select value={ledgerEmployeeId} onChange={(event) => setLedgerEmployeeId(event.target.value)}>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label><span>ปีสิทธิ 2569</span><div className="documents-balances"><span>ลาป่วย <b>{ledgerEmployee.sick} วัน · ใช้แล้ว {ledgerRows.filter((doc) => doc.title.includes('ป่วย') && doc.status === 'approved').length}</b></span><span>ลากิจ <b>{ledgerEmployee.personal} วัน · ใช้แล้ว {ledgerRows.filter((doc) => doc.title.includes('กิจ') && doc.status === 'approved').length}</b></span><span>ลาพักร้อน <b>{ledgerEmployee.vacation} วัน · ใช้แล้ว {ledgerRows.filter((doc) => doc.title.includes('พักร้อน') && doc.status === 'approved').length}</b></span></div><div className="documents-ledger-actions"><button onClick={exportLedgerCsv}>ส่งออก Excel (CSV mock)</button><button onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button></div></div><div className="documents-ledger-table-wrap"><table className="documents-ledger-table"><thead><tr><th>เลขที่</th><th>วันที่ / ประเภทการลา</th><th>จำนวนวัน</th><th>เหตุผล</th><th>สถานะ</th></tr></thead><tbody>{ledgerRows.map((doc) => <tr key={doc.id}><td>{doc.no}</td><td>{doc.summary}</td><td>{doc.title.match(/[\d.]+(?= วัน)/)?.[0] ?? '—'}</td><td>{doc.summary.split('·').pop()?.trim()}</td><td><span className={`documents-pill is-${STATUS_INFO[doc.status].className}`}>{STATUS_INFO[doc.status].label}</span></td></tr>)}</tbody></table></div></>}

    {view === 'employees' && <><div className="documents-tools"><label className="documents-search"><FaMagnifyingGlass /><input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="ค้นหาชื่อ รหัส หรือแผนก" /></label><span className="documents-stat">{employeeMatches.length} พนักงาน</span>{mockRole === 'HR' && <button className="documents-primary" onClick={() => setNewEmployeeOpen((open) => !open)}><FaPlus /> เพิ่มพนักงาน</button>}</div>{newEmployeeOpen && <form className="documents-employee-form" onSubmit={addMockEmployee}><input required value={newEmployeeName} onChange={(event) => setNewEmployeeName(event.target.value)} placeholder="ชื่อ - นามสกุล"/><input required value={newEmployeeCode} onChange={(event) => setNewEmployeeCode(event.target.value)} placeholder="รหัสพนักงาน"/><button type="submit">บันทึก mock</button></form>}<div className="documents-employee-grid">{employeeMatches.map((employee) => <article key={employee.id} className="documents-employee-card"><div className="documents-employee-avatar">{employee.name.charAt(0)}</div><span className={`documents-pill ${employee.active ? 'is-approved' : 'is-rejected'}`}>{employee.role}</span><h2>{employee.name}</h2><p>{employee.position} · {employee.department}</p><small>{employee.code} · ผู้จัดการ: {employee.manager}</small><div className="documents-balances"><span>ป่วย <b>{employee.sick}</b></span><span>กิจ <b>{employee.personal}</b></span><span>พักร้อน <b>{employee.vacation}</b></span></div></article>)}</div></>}

    {view === 'notifications' && <><div className="documents-tools"><label className="documents-email-toggle"><input type="checkbox" checked={emailEnabled} onChange={(event) => setEmailEnabled(event.target.checked)} /> รับอีเมลแจ้งเตือน: {emailEnabled ? 'เปิด' : 'ปิด'}</label><button onClick={markAllRead}>อ่านทั้งหมดแล้ว</button></div><div className="documents-notification-tabs"><button aria-pressed={notificationTab === 'app'} onClick={() => setNotificationTab('app')}>ในแอป ({notifications.length})</button><button aria-pressed={notificationTab === 'email'} onClick={() => setNotificationTab('email')}>อีเมลที่ส่ง (2)</button></div>{notificationTab === 'app' ? <div className="documents-notification-list">{notifications.map((notification) => <button key={notification.id} className={`documents-notification ${notification.read ? '' : 'is-unread'}`} onClick={() => { setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read:true } : item)); setSelectedNotification(notification) }}><span className="documents-icon"><FaFileLines /></span><span><b>{notification.title}</b><small>{notification.body} · {new Intl.DateTimeFormat('th-TH', { dateStyle:'medium', timeStyle:'short' }).format(new Date(notification.date))}</small></span></button>)}</div> : <div className="documents-email-preview"><p>โหมดตัวอย่าง: ยังไม่ได้ส่งอีเมลจริง</p><article><b>[Boswell] ใบ OT ของวีระ ศรีสุข รอพิจารณา</b><small>ถึง: นภา วงศ์สุข · 12 ต.ค. 2569</small><span>เปิดระบบเพื่อดูรายละเอียดและเซ็นอนุมัติ</span></article><article><b>[Boswell] ใบลาของสมชาย ใจดี รอ HR ตรวจ</b><small>ถึง: ศิริพร แก้วมณี · 12 ต.ค. 2569</small><span>ลากิจ 30 ต.ค. 2569 · 1 วัน</span></article></div>}</>}
    {(view === 'all' || view === 'pending') && <div className="documents-filter-wrap"><div className="documents-tools documents-filter-row">
      <label className="documents-search"><FaMagnifyingGlass /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาเอกสารหรือชื่อพนักงาน" /></label>
      <div className="documents-filter-tools"><div className="documents-view-toggle"><button aria-label="มุมมองการ์ด" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><FaTableCellsLarge /></button><button aria-label="มุมมองรายการ" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><FaList /></button></div>
        <button type="button" className={`documents-filter-trigger ${statusFilter !== 'all' || kindFilter !== 'all' ? 'is-active' : ''}`} aria-expanded={filterOpen} aria-controls="documents-filter-panel" onClick={() => { setDraftStatus(statusFilter); setDraftKind(kindFilter); setFilterOpen((open) => !open) }}><FaFilter /> ตัวกรอง{(statusFilter !== 'all' ? 1 : 0) + (kindFilter !== 'all' ? 1 : 0) > 0 && ` (${(statusFilter !== 'all' ? 1 : 0) + (kindFilter !== 'all' ? 1 : 0)})`}</button>
        <span className="documents-stat"><FaFileLines /> {visibleDocs.length} เอกสาร</span>
      </div>
    </div>{filterOpen && <form id="documents-filter-panel" className="documents-filter-panel" onSubmit={(event) => { event.preventDefault(); setKindFilter(draftKind); setStatusFilter(view === 'pending' ? 'all' : draftStatus); setFilterOpen(false) }}>
      <label className="documents-filter-field"><span>ประเภทเอกสาร</span><select value={draftKind} onChange={(event) => setDraftKind(event.target.value)}><option value="all">ทุกประเภท</option><option value="leave">ใบลา</option><option value="ot">ล่วงเวลา (OT)</option><option value="other">เอกสารอื่น ๆ</option></select></label>
      {view !== 'pending' && <label className="documents-filter-field"><span>สถานะ</span><select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอพิจารณา</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label>}
      <div className="documents-filter-actions"><button type="button" className="documents-filter-reset" onClick={() => { setDraftStatus('all'); setDraftKind('all'); setStatusFilter('all'); setKindFilter('all'); setFilterOpen(false) }}>ล้างตัวกรอง</button><button type="submit" className="documents-filter-apply">แสดงผล</button></div>
    </form>}</div>}

    {(view === 'all' || view === 'pending') && (visibleDocs.length ? <div className={`documents-cards ${layout === 'list' ? 'is-list' : ''}`}>{visibleDocs.map((doc) => {
      const info = KIND_INFO[doc.kind]; const Icon = info.icon; const status = STATUS_INFO[doc.status]
      return <article className="documents-card documents-card-clickable" key={doc.id} role="button" tabIndex={0} aria-label={`ดูรายละเอียด ${doc.title}`} onClick={() => setSelectedDocumentId(doc.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDocumentId(doc.id) } }}>
        <div className="documents-card-top"><span className="documents-icon"><Icon /></span><span className={`documents-pill is-${status.className}`}>{status.label}</span></div>
        <small className="documents-number">{doc.no} · {info.title}</small><h2>{doc.title}</h2><p className="documents-summary">{doc.summary}</p>
        {doc.note && <p className="documents-review-note">หมายเหตุ: {doc.note}</p>}
        <div className="documents-card-foot"><div><b>{doc.employee}</b><small>{doc.department} · {dateText(doc.date)}</small></div><div className="documents-card-actions">{doc.status === 'pending_mgr' && mockRole === 'พนักงาน' && doc.employee === 'สมชาย ใจดี' && <button className="is-cancel" onClick={(event) => { event.stopPropagation(); setDocuments((current) => current.filter((item) => item.id !== doc.id)) }}>ยกเลิก</button>}{doc.status === 'pending_mgr' && mockRole === 'ผู้จัดการแผนก' && doc.department === 'การตลาด' && <button onClick={(event) => { event.stopPropagation(); setSelectedDocumentId(doc.id) }}>เซ็นอนุมัติ</button>}{doc.status === 'pending_hr' && mockRole === 'HR' && doc.employee !== 'ศิริพร แก้วมณี' && <button onClick={(event) => { event.stopPropagation(); setSelectedDocumentId(doc.id) }}>เซ็นอนุมัติ HR</button>}{doc.status.startsWith('pending') && ((doc.status === 'pending_mgr' && mockRole === 'ผู้จัดการแผนก' && doc.department === 'การตลาด') || (doc.status === 'pending_hr' && mockRole === 'HR')) && <button className="is-cancel" onClick={(event) => { event.stopPropagation(); mockDecision(doc, true) }}>ไม่อนุมัติ</button>}</div></div>
      </article>
    })}</div> : <div className="documents-empty">ไม่พบเอกสาร ลองเปลี่ยนคำค้นหาหรือตัวกรอง</div>)}

    {selectedDocument && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDocumentId(null) }}><section className="documents-modal documents-detail-modal" role="dialog" aria-modal="true" aria-labelledby="document-detail-title">
      <div className="documents-modal-head"><div><span className={`documents-pill is-${STATUS_INFO[selectedDocument.status].className}`}>{STATUS_INFO[selectedDocument.status].label}</span><h2 id="document-detail-title">{selectedDocument.title}</h2><p>{selectedDocument.no} · ยื่นเมื่อ {dateText(selectedDocument.date)}</p></div><button aria-label="ปิด" onClick={() => setSelectedDocumentId(null)}><FaXmark /></button></div>
      <dl className="documents-detail-fields"><dt>ผู้ยื่น</dt><dd>{selectedDocument.employee}</dd><dt>แผนก</dt><dd>{selectedDocument.department}</dd><dt>รายละเอียด</dt><dd>{selectedDocument.summary}</dd>{selectedDocument.from && <><dt>วันที่ลา</dt><dd>{dateText(selectedDocument.from)}{selectedDocument.to && selectedDocument.to !== selectedDocument.from ? ` – ${dateText(selectedDocument.to)}` : ''}</dd></>}{selectedDocument.days !== undefined && <><dt>จำนวนวัน</dt><dd>{selectedDocument.days} วัน</dd></>}{selectedDocument.reason && <><dt>เหตุผล</dt><dd>{selectedDocument.reason}</dd></>}{selectedDocument.note && <><dt>หมายเหตุ</dt><dd>{selectedDocument.note}</dd></>}</dl>
      <div className="documents-signature-list">{(['ผู้ยื่น','ผู้จัดการแผนก','HR'] as SignatureStage[]).map((stage) => { const sig = selectedDocument.signatures?.[stage]; return <div className="documents-signature-card" key={stage}><div className="documents-signature-image">{sig ? <img src={sig.image} alt={`ลายเซ็น${stage}`} /> : <span>ยังไม่มีลายเซ็น</span>}</div><b>{stage}</b>{sig && <small>{sig.name} · {dateText(sig.date)}</small>}</div> })}</div>
      {(canSignAsSubmitter(selectedDocument) || (selectedDocument.status === 'pending_mgr' && mockRole === 'ผู้จัดการแผนก' && selectedDocument.department === 'การตลาด') || (selectedDocument.status === 'pending_hr' && mockRole === 'HR' && selectedDocument.employee !== 'ศิริพร แก้วมณี')) && <div className="documents-detail-actions">{canSignAsSubmitter(selectedDocument) && <button className="documents-primary" onClick={() => setSigningDocumentId(selectedDocument.id)}><FaPenNib /> เซ็นชื่อผู้ยื่น</button>}{selectedDocument.status.startsWith('pending') && ((selectedDocument.status === 'pending_mgr' && mockRole === 'ผู้จัดการแผนก' && selectedDocument.department === 'การตลาด') || (selectedDocument.status === 'pending_hr' && mockRole === 'HR' && selectedDocument.employee !== 'ศิริพร แก้วมณี')) && <><button className="documents-primary" onClick={() => setSigningDocumentId(selectedDocument.id)}><FaPenNib /> เซ็นอนุมัติ</button><button className="documents-reject" onClick={() => mockDecision(selectedDocument, true)}>ไม่อนุมัติ</button></>}</div>}
      <button className="documents-detail-close" onClick={() => setSelectedDocumentId(null)}>ปิด</button>
    </section></div>}

    {signingDocument && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSigningDocumentId(null) }}><section className="documents-modal documents-signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title"><div className="documents-modal-head"><div><h2 id="signature-modal-title">{signatureStage(signingDocument) === 'ผู้ยื่น' ? 'เซ็นชื่อผู้ยื่น' : `เซ็นอนุมัติ · ${signatureStage(signingDocument)}`}</h2><p>{signingDocument.title} · {signingDocument.employee}</p></div><button aria-label="ปิด" onClick={() => setSigningDocumentId(null)}><FaXmark /></button></div><div className="documents-signature-pad"><canvas ref={signatureCanvas} width={640} height={240} aria-label="พื้นที่เซ็นชื่อ ใช้นิ้วหรือเมาส์เซ็น" onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={finishSignature} onPointerCancel={finishSignature} /></div><label className="documents-remember-signature"><input type="checkbox" checked={rememberSignature} onChange={(event) => setRememberSignature(event.target.checked)} /> จำลายเซ็นนี้ไว้ใช้ครั้งถัดไป</label><div className="documents-signature-actions"><button onClick={clearSignature}>ล้างลายเซ็น</button><button className="documents-primary" disabled={!signatureHasInk} onClick={confirmSignature}>ยืนยันการเซ็น</button></div></section></div>}

    {selectedNotification && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedNotification(null) }}><section className="documents-modal"><div className="documents-modal-head"><div><span className="documents-pill is-pending">เอกสารที่เกี่ยวข้อง</span><h2>{selectedNotification.title}</h2><p>{selectedNotification.body}</p></div><button aria-label="ปิด" onClick={() => setSelectedNotification(null)}><FaXmark /></button></div><p>รายการ: {documents.find((doc) => doc.id === selectedNotification.documentId)?.no ?? 'ไม่พบเอกสาร'}</p><button className="documents-primary" onClick={() => setSelectedNotification(null)}>ปิด</button></section></div>}

    {formOpen && <div className="documents-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setFormOpen(false); setSelectedKind('') } }}><form className="documents-modal" onSubmit={submitMock}>
      <div className="documents-modal-head"><div><h2>{selectedKind ? KIND_INFO[selectedKind].title : 'ยื่นเอกสารใหม่'}</h2><p>{selectedKind ? 'กรอกข้อมูลตัวอย่างเพื่อแสดงในรายการ' : 'เลือกประเภทเอกสารที่ต้องการ'}</p></div><button type="button" aria-label="ปิด" onClick={() => { setFormOpen(false); setSelectedKind('') }}><FaXmark /></button></div>
      {!selectedKind ? <div className="documents-kind-grid">{(Object.keys(KIND_INFO) as DocKind[]).map((kind) => { const info = KIND_INFO[kind]; const Icon = info.icon; return <button type="button" key={kind} onClick={() => setSelectedKind(kind)}><span className="documents-icon"><Icon /></span><span><b>{info.title}</b><small>{info.description}</small></span></button> })}</div> : <>
        <label>หัวข้อ<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={KIND_INFO[selectedKind].title} /></label>
        <label>รายละเอียด / วันที่<textarea rows={4} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="เช่น วันที่ลา, เหตุผล หรือรายละเอียดการขอ" /></label>
        <div className="documents-modal-actions"><button type="button" onClick={() => setSelectedKind('')}>กลับไปเลือกประเภท</button><button type="submit" className="documents-primary">เพิ่มรายการ mock</button></div>
      </>}
    </form></div>}
    {toast && <div className="documents-toast" role="status">{toast}</div>}
  </section>
}
