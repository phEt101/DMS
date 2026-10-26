import { db } from '../../../config/database.js'
import { deleteMedicalCertificateFile, MEDICAL_CERTIFICATE_RETENTION_DAYS } from '../middleware/medical-certificate-upload.middleware.js'

// ตรวจและลบไฟล์ใบรับรองแพทย์ที่พักในโฟลเดอร์ "ยกเลิก-ไม่อนุมัติ" ครบกำหนด 30 วันแล้ว
export async function sweepExpiredMedicalCertificates(): Promise<void> {
  const [rows] = await db.query<any[]>(
    `SELECT request_id, storage_path FROM employee_request_medical_certificates
      WHERE disposal_status = 'retained' AND disposal_at IS NOT NULL AND disposal_at <= NOW()`,
  )
  for (const row of rows) {
    await deleteMedicalCertificateFile(row.storage_path)
    await db.execute(
      `DELETE FROM employee_request_medical_certificates WHERE request_id = ? AND disposal_status = 'retained'`,
      [row.request_id],
    )
  }
  if (rows.length) {
    console.log(`medical-certificate retention: disposed ${rows.length} file(s) (เก็บรักษา ${MEDICAL_CERTIFICATE_RETENTION_DAYS} วันครบกำหนด)`)
  }
}

const SWEEP_INTERVAL_MS = 60 * 60 * 1000 // ทุก 1 ชั่วโมง
let timer: NodeJS.Timeout | null = null

export function startMedicalCertificateRetentionJob(): void {
  if (timer) return
  // รันครั้งแรกหลังเปิดเซิร์ฟเวอร์ 30 วินาที แล้วทำซ้ำทุกชั่วโมง
  const firstRun = setTimeout(() => {
    void sweepExpiredMedicalCertificates().catch((error) => console.error('medical-certificate retention failed', error))
    timer = setInterval(() => {
      void sweepExpiredMedicalCertificates().catch((error) => console.error('medical-certificate retention failed', error))
    }, SWEEP_INTERVAL_MS)
  }, 30_000)
  firstRun.unref()
}

export function stopMedicalCertificateRetentionJob(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
