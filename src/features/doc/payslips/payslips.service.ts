import { apiUrl, request } from '../../../services/api'

export type MyPayslip = {
  id: number
  year: number
  month: number
  note: string | null
  fileName: string
  fileSize: number
  viewedAt: string | null
  updatedAt: string
}

export type ManagedPayslipRow = {
  userId: number
  name: string
  email: string
  avatarUrl: string | null
  department: string | null
  payslipId: number | null
  fileName: string | null
  fileSize: number | null
  note: string | null
  viewedAt: string | null
  updatedAt: string | null
}

export type BulkResult = {
  saved: Array<{ file: string; employee: string }>
  failed: Array<{ file: string; reason: string }>
}

export const payslipFileUrl = (id: number, download = false) =>
  apiUrl(`/payslips/${id}/file${download ? '?download=1' : ''}`)

export const payslipPreviewUrl = (id: number) => apiUrl(`/payslips/${id}/file?preview=1`)

export async function listMyPayslips(): Promise<MyPayslip[]> {
  return ((await request('/payslips/me')) as { data: MyPayslip[] }).data
}

export async function listManagedPayslips(year: number, month: number): Promise<ManagedPayslipRow[]> {
  return ((await request(`/payslips/manage?year=${year}&month=${month}`)) as { data: ManagedPayslipRow[] }).data
}

export async function uploadPayslip(userId: number, year: number, month: number, file: File, note: string): Promise<void> {
  const body = new FormData()
  body.append('note', note)
  body.append('file', file)
  await request(`/payslips/manage/${userId}?year=${year}&month=${month}`, { method: 'PUT', body })
}

export async function bulkUploadPayslips(year: number, month: number, files: File[]): Promise<BulkResult> {
  const body = new FormData()
  body.append('year', String(year))
  body.append('month', String(month))
  files.forEach((file) => body.append('files', file))
  return ((await request('/payslips/manage/bulk', { method: 'POST', body })) as { data: BulkResult }).data
}

export async function deletePayslip(id: number): Promise<void> {
  await request(`/payslips/manage/${id}`, { method: 'DELETE' })
}
