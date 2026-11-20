export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface SessionDevice {
  browser: string
  os: string
  type: DeviceType
}

// อ่าน user agent แบบง่ายโดยไม่เพิ่ม dependency — พอสำหรับแสดง "อุปกรณ์" ในหน้ารายการผู้ใช้ออนไลน์
export function parseDevice(userAgent: string | null | undefined): SessionDevice | null {
  if (!userAgent) return null

  const browser = [
    { pattern: /Edg\//, name: 'Edge' },
    { pattern: /OPR\//, name: 'Opera' },
    { pattern: /(?:Chrome|CriOS)\//, name: 'Chrome' },
    { pattern: /(?:Firefox|FxiOS)\//, name: 'Firefox' },
    { pattern: /Safari\//, name: 'Safari' },
  ].find(({ pattern }) => pattern.test(userAgent))?.name ?? 'Browser'

  const os = [
    { pattern: /iPhone|iPad|iPod/, name: 'iOS' },
    { pattern: /Android/, name: 'Android' },
    { pattern: /Windows/, name: 'Windows' },
    { pattern: /Macintosh|Mac OS X/, name: 'macOS' },
    { pattern: /Linux/, name: 'Linux' },
  ].find(({ pattern }) => pattern.test(userAgent))?.name ?? 'Unknown'

  let type: DeviceType = 'unknown'
  if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
    type = 'tablet'
  } else if (/iPhone|iPod|Android.*Mobile|Windows Phone|Mobile/i.test(userAgent)) {
    type = 'mobile'
  } else if (os === 'Windows' || os === 'macOS' || os === 'Linux') {
    type = 'desktop'
  }

  return { browser, os, type }
}
