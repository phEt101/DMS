import L from 'leaflet'
import type { Survey, EquipmentItem } from '../../types'

export function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
}

// Leaflet default icon (ประกาศนอก component เพื่อไม่ให้สร้างใหม่ทุกครั้งที่ render)
export const DefaultIcon = L.icon({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

/** แปลง qty ให้เป็น number หรือ undefined */
export function cleanEquipment(arr: any[]) {
  return arr.map((it: any) => ({ ...it, qty: Number.isFinite(Number(it.qty)) ? Number(it.qty) : undefined }))
}

const COUNTRY_NAMES: Record<string, string> = {
  TH: 'ประเทศไทย',
  THA: 'ประเทศไทย',
  THAILAND: 'ประเทศไทย',
}

/** แปลงรหัสประเทศจาก DB (เช่น TH) เป็นชื่อไทย ถ้าไม่รู้จักให้คืนค่าเดิม */
export function formatCountry(c?: string | null): string | undefined {
  if (!c) return undefined
  return COUNTRY_NAMES[c.trim().toUpperCase()] ?? c
}

export const DEFAULT_EQUIPMENT_NAMES = [
  'Graphic Annunciator',
  'Smoke Detector',
  'Heat Detector',
  'Manual Detector',
  'Alarm Bell',
  'Computer',
  'Module Box',
]

const truthy = (v: any) => v === true || v === 1 || v === '1' || v === 'true' || v === 'yes'

/** แปลงค่าไว้สำหรับ input[type=date] ให้เป็น YYYY-MM-DD หรือ undefined */
export function formatDateForInput(v?: string | Date | null): string | undefined {
  if (!v) return undefined
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

/** ทำให้ข้อมูลที่โหลดจาก API พร้อมใช้ในฟอร์มแก้ไข (status / name / isCustom) */
function normalizeInitial(s: Survey): Survey {
  const equipment = ((s.equipment ?? []) as any[]).map((e) => {
    const name = e.name ?? e.customName ?? e.typeName ?? ''
    const present = e.status ? e.status === 'yes' : truthy(e.isPresent ?? e.is_present)
    return {
      ...e,
      name,
      status: present ? 'yes' : 'no',
      // รายการที่ไม่ใช่ 7 รายการมาตรฐาน = รายการ "อื่นๆ" ที่ผู้ใช้เพิ่มเอง
      isCustom: e.isCustom ?? !DEFAULT_EQUIPMENT_NAMES.includes(name),
    }
  })
  const location = s.location ? { ...s.location, country: formatCountry(s.location.country) } : s.location

  // Ensure surveyDate is normalized to YYYY-MM-DD for input[type=date]
  // formatDateForInput already returns YYYY-MM-DD or undefined for invalid values
  const normalizedSurveyDate = formatDateForInput(s.surveyDate) ?? (typeof s.surveyDate === 'string' ? s.surveyDate.slice(0, 10) : undefined)

  return { ...s, surveyDate: normalizedSurveyDate ?? '', equipment, location } as Survey
}

export function getDefaultValues(initial?: Survey | null): Survey {
  if (initial) return normalizeInitial(initial)
  const now = new Date().toISOString().slice(0, 10)
  return {
    id: `survey-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    surveyDate: now,
    projectName: '',
    province: '',
    floors: undefined,
    contact1: { name: '', position: '', phone: '' },
    contact2: { name: '', position: '', phone: '' },
    visitType: '',
    signPhoto: null,
    fcpBrand: '',
    fcpModel: '',
    fcpType: '',
    fcpMaterial: '',
    fcpStatus: '',
    fcpOverview: null,
    fcpNameplate: null,
    fcpInside: null,
    equipment: [
      { name: 'Graphic Annunciator', status: 'no' },
      { name: 'Smoke Detector', status: 'no' },
      { name: 'Heat Detector', status: 'no' },
      { name: 'Manual Detector', status: 'no' },
      { name: 'Alarm Bell', status: 'no' },
      { name: 'Computer', status: 'no' },
      { name: 'Module Box', status: 'no' },
    ] as EquipmentItem[],
    notes: '',
  } as unknown as Survey
}