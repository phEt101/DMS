export type DocKind = 'leave' | 'ot' | 'timefix' | 'outing'
export type Status = 'pending_mgr' | 'pending_exec' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled'
/** สถานะที่ใช้แสดงผล: เพิ่ม 'resubmitted' เมื่อเอกสารถูกยื่นแก้ไขและกำลังรอพิจารณารอบใหม่ */
export type DisplayStatus = Status | 'resubmitted'
export type MockSignature = { image: string; name: string; date: string; avatarUrl?: string | null }
export type SupportingDocument = { id: number; originalName: string; mimeType: string; fileSize: number }
export type SignatureStage = 'ผู้ยื่น' | 'ผู้จัดการแผนก' | 'ผู้ประกอบการ' | 'HR'
export type FormValues = Record<string, string | boolean>
export type ReviewDecision = { stage: string; action: string; signerName: string; note: string | null; signedAt: string }
export type ReviewRound = {
  roundNo: number
  rejectedStage: 'manager' | 'executive' | 'hr' | null
  rejectionNote: string | null
  submittedAt: string | null
  rejectedAt: string | null
  resubmittedAt: string
  request: { startDate?: string | null; endDate?: string | null; days?: number | null; reason?: string | null; detail?: Record<string, unknown> | null } | null
  decisions: ReviewDecision[]
}
/** เอกสารที่ถูกไม่อนุมัติแล้วยื่นแก้ไขจะแสดงสถานะ 'ยื่นแก้ไขใหม่' จนกว่าจะจบรอบใหม่ */
export const displayStatusOf = (doc: Pick<MockDocument, 'status' | 'revisionNo'>): DisplayStatus =>
  doc.revisionNo && doc.revisionNo > 0
    && ['pending_mgr', 'pending_exec', 'pending_hr'].includes(doc.status)
    ? 'resubmitted'
    : doc.status
export type MockDocument = {
  id: number; no: string; kind: DocKind; title: string; summary: string; employee: string; department: string; date: string; submittedAt?: string; status: Status; note?: string;
  employeeUserId?: number
  resubmittedFromRequestNo?: string | null
  revisionNo?: number
  rejectionCount?: number
  resubmittedAt?: string | null
  lastRejectedAt?: string | null
  reviewHistory?: ReviewRound[]
  leaveType?: 'personal' | 'sick' | 'vacation' | 'emergency' | 'unpaid' | 'maternity' | 'childcare_after_maternity' | 'spouse_childbirth' | 'ordain' | 'other';
  from?: string; to?: string; days?: number; reason?: string; rejectedBy?: 'manager' | 'executive' | 'hr'; formData?: FormValues; signatures?: Partial<Record<SignatureStage, MockSignature>>
     mgrSignerName?: string; mgrSignedAt?: string; execSignerName?: string; execSignedAt?: string; hrSignerName?: string; hrSignedAt?: string
     employeeAvatarUrl?: string | null
     supportingDocuments?: SupportingDocument[]
     medicalCertificateAvailable?: boolean
     flow?: { stages: Array<'manager' | 'executive' | 'hr'>; recordAfterStage: string | null } | null
  }
export type MockEmployee = { id: string; name: string; code: string; department: string; email?: string; emailNotify?: boolean; role: 'พนักงาน' | 'ผู้จัดการแผนก' | 'HR'; sick: number; personal: number; vacation: number; other?: number; active: boolean; startDate: string; appointedDate: string }
export type MockNotification = { id: number; title: string; body: string; date: string; read: boolean; documentId: number }

export type MockPolicy = {
  year: number; expiry: string; yearStart: string; yearEnd: string
  leadPersonal: number; leadVacation: number; hoursPerDay: number; hourStep: number
  certDays: number; otMax: number; fixDays: number; emergencyMaxDays: number
  ordainMaxDays: number; compassionateEmployeeMaxDays: number; compassionateEmployeePaidDays: number
  compassionateSpouseParentMaxDays: number; compassionateSpouseParentPaidDays: number
  maternityMaxDays: number; childcareMaxDays: number; childcarePayPercent: number
  spouseChildbirthMaxDays: number; spouseChildbirthWindowDays: number
}
