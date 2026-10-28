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
  return apiUrl(encoded)
}
