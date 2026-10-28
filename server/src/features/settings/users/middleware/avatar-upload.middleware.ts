import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { httpError } from '../../../../middleware/errors.js'

// โฟลเดอร์เก็บรูปโปรไฟล์ผู้ใช้งาน (แนบไฟล์เข้า server ไม่ใช่ URL ภายนอก)
// แยกโฟลเดอร์ตามแผนกเพื่อให้หาไฟล์ง่าย: storage/avatars/<แผนก>/<ชื่อผู้ใช้>-<userId>.<นามสกุล>
export const avatarDirectory = path.resolve(process.cwd(), 'storage', 'avatars')
mkdirSync(avatarDirectory, { recursive: true })

// ชื่อที่ปลอดภัยสำหรับเป็นชื่อไฟล์/โฟลเดอร์ (ตัดอักขระจัดไฟล์ทิ้ง เก็บตัวอักษร ตัวเลข ขีด _)
function safeSegment(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'unknown'
}

// โฟลเดอร์ย่อยของแผนก (จาก session ของคนอัปโหลด) + ชื่อไฟล์อิงชื่อผู้ใช้ปลายทาง
export function avatarRelativePathOf(department: string | null | undefined, targetUserId: number | string, extension: string): string {
  const departmentFolder = safeSegment(department ?? 'ไม่มีแผนก')
  const fileName = `user-${targetUserId}${extension.toLowerCase()}`
  return path.join(departmentFolder, fileName)
}

const allowedTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    try {
      // เก็บชั่วคราวในโฟลเดอร์ราก — controller จะย้ายเข้าโฟลเดอร์แผนก + ตั้งชื่อไฟล์ตามผู้ใช้ปลายทาง
      mkdirSync(avatarDirectory, { recursive: true })
      callback(null, avatarDirectory)
    } catch (error) {
      callback(error as Error, '')
    }
  },
  filename: (_req, file, callback) => {
    try {
      callback(null, `tmp-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname).toLowerCase()}`)
    } catch (error) {
      callback(error as Error, '')
    }
  },
})

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    if (allowedTypes[extension] !== file.mimetype) {
      callback(httpError(400, 'รูปโปรไฟล์ต้องเป็นไฟล์ JPG, PNG หรือ WEBP'))
      return
    }
    callback(null, true)
  },
})

// ลบไฟล์รูปโปรไฟล์เดิมออกจากดิสก์ (relativePath รวมโฟลเดอร์แผนก เช่น "HR/user-a-3.png")
export function deleteAvatarFile(relativePath: string | null | undefined): void {
  if (!relativePath) return
  const fileName = path.basename(relativePath)
  // ลบทั้งตำแหน่งแบบใหม่ (โฟลเดอร์แผนก) และแบบเก่า (รากโฟลเดอร์) — กันไฟล์ขยะตกค้างจากรูปแบบเดิม
  const candidates = [path.join(avatarDirectory, relativePath), path.join(avatarDirectory, fileName)]
  for (const fullPath of candidates) {
    if (existsSync(fullPath)) {
      try {
        rmSync(fullPath)
      } catch {
        // ลบไฟล์ไม่สำเร็จไม่ถือเป็น error หลัก — path ใน DB ถูกลบแล้ว
      }
    }
  }
}

// URL สำหรับเรียกดูรูปผ่าน API — encode ทีละ segment เพื่อรองรับโฟลเดอร์ย่อยตามแผนก
export function avatarUrlOf(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  const fileName = path.basename(relativePath)
  const userId = fileName.match(/^(?:user-)?(?:.*-)?(\d+)\.[^.]+$/)?.[1]
  if (userId) return `/boswell-api/v1/avatars/user/${userId}`
  const encoded = relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `/boswell-api/v1/avatars/${encoded}`
}
