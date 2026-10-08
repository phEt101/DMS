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
  return { ...s, equipment } as Survey
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

/** Normalize an ISO date or Date to yyyy-MM-dd for input[type=date] value */
export function formatDateForInput(v?: string | Date | null): string | undefined {
  if (!v) return undefined
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return undefined
  // yyyy-MM-dd
  return d.toISOString().slice(0, 10)
}
