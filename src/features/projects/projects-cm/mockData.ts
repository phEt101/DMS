export type CmStatus =
  | 'reported'
  | 'awaiting_inspection'
  | 'queued'
  | 'in_progress'
  | 'awaiting_acceptance'
  | 'done'
  | 'cancelled'

export type CmPriority = 'low' | 'medium' | 'high' | 'critical'

export interface CmProject {
  id: string
  code: string
  name: string
  customer: string
  problem: string
  objective?: string
  priority: CmPriority
  problemType?: string
  status: CmStatus
  requestedDate?: string
  plannedStart?: string
  plannedEnd?: string
  responsible?: string
  location?: string
  estimatedCost?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export const CM_STATUSES: { value: CmStatus; label: string }[] = [
  { value: 'reported', label: 'แจ้งปัญหา' },
  { value: 'awaiting_inspection', label: 'รอตรวจสอบ' },
  { value: 'queued', label: 'รอดำเนินการ' },
  { value: 'in_progress', label: 'กำลังซ่อม' },
  { value: 'awaiting_acceptance', label: 'รอตรวจรับ' },
  { value: 'done', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

export const CM_PRIORITIES: { value: CmPriority; label: string }[] = [
  { value: 'low', label: 'ต่ำ' },
  { value: 'medium', label: 'ปานกลาง' },
  { value: 'high', label: 'สูง' },
  { value: 'critical', label: 'วิกฤต' },
]

export const CM_PROBLEM_TYPES = ['ไฟฟ้า', 'ประปา', 'เครื่องกล', 'โครงสร้าง', 'อื่นๆ']

export const MOCK_CM_PROJECTS: CmProject[] = [
  {
    id: 'cm-001',
    code: 'CM-001',
    name: 'ซ่อมแซมระบบไฟฟ้า อาคาร A',
    customer: 'อาคาร A',
    problem: 'ไฟฟ้าดับบางจุดในชั้น 3',
    objective: 'คืนสภาพการใช้งานไฟฟ้า',
    priority: 'high',
    problemType: 'ไฟฟ้า',
    status: 'reported',
    requestedDate: '2026-10-01',
    plannedStart: '2026-10-03',
    plannedEnd: '2026-10-05',
    responsible: 'ทีมช่างไฟฟ้า',
    location: 'ชั้น 3, อาคาร A',
    estimatedCost: 12000,
    notes: 'ต้องใช้ตู้คอนโทรลสำรอง',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cm-002',
    code: 'CM-002',
    name: 'ซ่อมปั๊มน้ำ ตึก B',
    customer: 'ตึก B',
    problem: 'ปั๊มน้ำมีเสียงดังและหยุดทำงานเป็นบางครั้ง',
    objective: 'ตรวจสอบและเปลี่ยนอะไหล่',
    priority: 'medium',
    problemType: 'เครื่องกล',
    status: 'in_progress',
    requestedDate: '2026-09-28',
    plannedStart: '2026-09-30',
    plannedEnd: '2026-10-04',
    responsible: 'ทีมเครื่องกล',
    location: 'ห้องปั๊ม ตึก B',
    estimatedCost: 8000,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
