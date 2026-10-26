import { copyFileSync, existsSync, mkdirSync, rmSync, renameSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { httpError } from '../../../middleware/errors.js'

export const medicalCertificateDirectory = path.resolve(process.cwd(), 'storage', 'medical-certificates')
// โฟลเดอร์พักไฟล์ของเอกสารที่ถูกยกเลิก/ไม่อนุมัติ ก่อนหมดอายุ 30 วันแล้วลบจริง
export const medicalCertificateDisposalDirectory = path.resolve(medicalCertificateDirectory, 'ยกเลิก-ไม่อนุมัติ')
mkdirSync(medicalCertificateDirectory, { recursive: true })
mkdirSync(medicalCertificateDisposalDirectory, { recursive: true })

// แปลงชื่อแผนก/ชื่อผู้ใช้เป็นชื่อโฟลเดอร์หรือไฟล์ที่ปลอดภัย (ตัดอักขระต้องห้ามและช่องว่างเกินออก)
function sanitize(input: string | null | undefined): string {
  return String(input ?? '')
    .trim()
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

const safeFolderName = (department: string | null | undefined): string => sanitize(department) || 'ไม่ระบุแผนก'
const safeFileName = (name: string | null | undefined): string => sanitize(name) || 'user'

// รับวันที่ลารูปแบบ YYYY-MM-DD แล้วแปลงเป็น YYYYMMDD
// ถ้าไม่มีหรือรูปแบบไม่ถูกต้อง ใช้วันที่อัปโหลดแทน
function formatLeaveDate(raw: unknown): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00Z`)
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(raw)) {
      return raw.replace(/-/g, '')
    }
  }
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

const allowedTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

// หาโฟลเดอร์ปลายทางจากแผนกของผู้ใช้ (ใช้ร่วมกันทั้ง destination และ filename)
function resolveTargetDirectory(req: { user?: unknown }): string {
  const user = req.user as { department?: string | null } | undefined
  return path.join(medicalCertificateDirectory, safeFolderName(user?.department ?? null))
}

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    try {
      const target = resolveTargetDirectory(req)
      mkdirSync(target, { recursive: true })
      callback(null, target)
    } catch (error) {
      callback(error as Error, '')
    }
  },
  filename: (req, file, callback) => {
    try {
      const user = req.user as { name?: string } | undefined
      const extension = path.extname(file.originalname).toLowerCase()
      const base = safeFileName(user?.name)
      const leaveDate = formatLeaveDate((req.body as Record<string, unknown> | undefined)?.leaveDate)
      const targetDirectory = resolveTargetDirectory(req)

      const baseName = `${base}_ใบรับรองแพทย์_${leaveDate}`
      let candidate = `${baseName}${extension}`
      let counter = 2
      // ถ้าชื่อซ้ำ ให้ต่อท้าย _2, _3, ... ไม่เขียนทับไฟล์เดิม
      while (existsSync(path.join(targetDirectory, candidate))) {
        candidate = `${baseName}_${counter}${extension}`
        counter += 1
      }

      callback(null, candidate)
    } catch (error) {
      callback(error as Error, '')
    }
  },
})

// จำนวนวันที่เก็บไฟล์ของเอกสารยกเลิก/ไม่อนุมัติก่อนลบจริง
export const MEDICAL_CERTIFICATE_RETENTION_DAYS = 30

const insideDirectory = (target: string, directory: string) =>
  target.startsWith(`${directory}${path.sep}`) || path.dirname(target) === directory

// ย้ายไฟล์ใบรับรองแพทย์ไปโฟลเดอร์พัก "ยกเลิก-ไม่อนุมัติ" (ใช้ตอนเอกสารถูกยกเลิก/ไม่อนุมัติ)
// เปลี่ยนชื่อไฟล์ใหม่ตอนย้ายด้วย เพื่อไม่ให้ชน unique key กับไฟล์อัปโหลดใหม่ที่ใช้ชื่อเดิม
// คืน { path, storedName } ของไฟล์ในโฟลเดอร์พัก หรือ null ถ้าย้ายไม่สำเร็จ
export function moveMedicalCertificateToDisposal(
  storagePath: string | null | undefined,
): { path: string; storedName: string } | null {
  
  if (!storagePath) return null
  const resolved = path.resolve(String(storagePath))
  if (!insideDirectory(resolved, medicalCertificateDirectory)) return null
  if (!existsSync(resolved)) return null
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const extension = path.extname(resolved)
  const base = path.basename(resolved, extension)
  try {
    mkdirSync(medicalCertificateDisposalDirectory, { recursive: true })
    let storedName = `${base}_ยกเลิก${dateTag}${extension}`
    let target = path.join(medicalCertificateDisposalDirectory, storedName)
    let counter = 2
    // ถ้าชื่อซ้ำในโฟลเดอร์พัก ให้ต่อท้าย _2, _3, ... ไม่เขียนทับไฟล์เดิม
    while (existsSync(target)) {
      storedName = `${base}_ยกเลิก${dateTag}_${counter}${extension}`
      target = path.join(medicalCertificateDisposalDirectory, storedName)
      counter += 1
    }
    renameSync(resolved, target)
    return { path: target, storedName }
  } catch {
    // ย้ายไม่สำเร็จ (เช่นข้ามดิสก์) → สำรองด้วยการคัดลอกแล้วลบต้นฉบับ
    try {
      const storedName = `${base}_ยกเลิก${dateTag}_${Date.now()}${extension}`
      const fallback = path.join(medicalCertificateDisposalDirectory, storedName)
      copyFileSync(resolved, fallback)
      rmSync(resolved, { force: true })
      return { path: fallback, storedName }
    } catch {
      return null
    }
  }
}

// ลบไฟล์ใบรับรองแพทย์ที่หมดอายุการเก็บรักษาแล้ว (ไฟล์ต้องอยู่ในโฟลเดอร์พักเท่านั้น)
export function deleteMedicalCertificateFile(storagePath: string | null | undefined): void {
  if (!storagePath) return
  const resolved = path.resolve(String(storagePath))
  if (!insideDirectory(resolved, medicalCertificateDisposalDirectory)) return
  try {
    rmSync(resolved, { force: true })
  } catch {
    // ลบไฟล์ไม่สำเร็จไม่ถือเป็น error ของธุรกรรมหลัก (จะถูกลบในรอบถัดไป)
  }
}

export const medicalCertificateUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (allowedTypes[extension] !== file.mimetype) {
      callback(httpError(400, 'ไฟล์ใบรับรองแพทย์ต้องเป็น PDF, JPG หรือ PNG'))
      return
    }
    callback(null, true)
  },
})