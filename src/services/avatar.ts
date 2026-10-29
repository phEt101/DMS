import { apiUrl } from './api'

function encodePathSegment(segment: string): string {
  if (!segment) return segment
  try {
    return encodeURIComponent(decodeURIComponent(segment))
  } catch {
    return encodeURIComponent(segment)
  }
}

// แปลง avatarUrl จาก server (path เช่น /boswell-api/v1/avatars/<แผนก>/<ไฟล์> หรือชื่อไฟล์ล้วน)
// ให้เป็น URL เต็มที่ใช้กับ <img> ได้ทุกสภาพแวดล้อม (dev proxy / production domain แยก)
export function avatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http')) return avatarUrl
  const pathname = avatarUrl.startsWith('/')
    ? avatarUrl.replace(/^\/boswell-api\/v1/, '')
    : `/avatars/${avatarUrl}`
  // Normalize encoded server segments before encoding to avoid turning "%XX" into "%25XX".
  const encoded = pathname
    .split('/')
    .map(encodePathSegment)
    .join('/')
  // cache-busting: URL เสิร์ฟรูปคงที่ตาม user id (/avatars/user/<id>) — ถ้า proxy/CDN
  // หรือ browser แคชรูปเก่าไว้ ผู้ใช้จะเปลี่ยนรูปไม่ได้จนกว่าจะลบบัญชีแล้วสร้างใหม่
  // (ฝั่ง server ก็ตั้ง Cache-Control: no-store แล้ว อันนี้กันเหนียวอีกชั้นสำหรับ proxy)
  return apiUrl(`${encoded}?v=${Date.now()}`)
}
