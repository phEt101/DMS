export type DocKind = 'leave' | 'ot' | 'timefix' | 'wfh' | 'outing' | 'swap'
export type Status = 'pending_mgr' | 'pending_exec' | 'pending_hr' | 'approved' | 'rejected'
export type MockSignature = { image: string; name: string; date: string }
export type SignatureStage = 'ผู้ยื่น' | 'ผู้จัดการแผนก' | 'ผู้ประกอบการ' | 'HR'
export type FormValues = Record<string, string | boolean>
export type MockDocument = {
  id: number; no: string; kind: DocKind; title: string; summary: string; employee: string; department: string; date: string; status: Status; note?: string;
  leaveType?: 'personal' | 'sick' | 'vacation' | 'emergency' | 'unpaid' | 'maternity' | 'ordain' | 'marriage' | 'other';
  from?: string; to?: string; days?: number; reason?: string; rejectedBy?: 'manager' | 'executive' | 'hr'; formData?: FormValues; signatures?: Partial<Record<SignatureStage, MockSignature>>
     mgrSignerName?: string; mgrSignedAt?: string; execSignerName?: string; execSignedAt?: string; hrSignerName?: string; hrSignedAt?: string
     medicalCertificateAvailable?: boolean
     flow?: { stages: Array<'manager' | 'executive' | 'hr'>; recordAfterStage: string | null } | null
  }
export type MockEmployee = { id: string; name: string; code: string; department: string; position: string; email?: string; emailNotify?: boolean; role: 'พนักงาน' | 'ผู้จัดการแผนก' | 'HR'; manager: string; sick: number; personal: number; vacation: number; other?: number; active: boolean; startDate: string; appointedDate: string }
export type MockNotification = { id: number; title: string; body: string; date: string; read: boolean; documentId: number }

export type MockPolicy = { year: number; expiry: string; yearStart: string; yearEnd: string; leadPersonal: number; leadVacation: number; hoursPerDay: number; hourStep: number; certDays: number; otMax: number; fixDays: number }
