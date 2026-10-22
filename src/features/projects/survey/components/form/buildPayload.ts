/** ดึง file id จาก URL รูปที่โหลดมาจาก server (รูปใหม่เป็น data: จะได้ null) */
const fileIdFromUrl = (v: unknown): number | null => {
  const m = typeof v === 'string' ? /\/surveys\/files\/(\d+)/.exec(v) : null
  return m ? Number(m[1]) : null
}

/** Normalize client-side fcp power status values to server-accepted enum ('on'|'off') */
function normalizeClientFcpPowerStatus(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v ? 'on' : 'off'
  const s = String(v).trim().toLowerCase()
  if (!s) return null
  const onValues = new Set(['on', 'true', '1', 'yes', 'เปิด', 'open'])
  const offValues = new Set(['off', 'false', '0', 'no', 'ปิด', 'close'])
  if (onValues.has(s)) return 'on'
  if (offValues.has(s)) return 'off'
  // accept direct 'on'/'off' even if already normalized
  if (s === 'on' || s === 'off') return s
  return null
}

/** สร้าง payload ตามรูปแบบที่ backend ต้องการ */
function normalizeClientVisitType(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim().toLowerCase()
  if (!s) return null
  if (s === 'contact_new' || s === 'contact-new' || s === 'contact') return 'survey_by_sale'
  if (s === 'ref_doc' || s === 'ref-doc' || s === 'ref') return 'survey_by_sale_service'
  if (s === 'survey_by_sale' || s === 'survey_by_sale_service') return s
  if (s === 'เยี่ยมขาย') return 'survey_by_sale'
  if (s === 'เยี่ยมขายและเซอร์วิส') return 'survey_by_sale_service'
  return null
}

export function buildBodyPayload(payload: any): any {
  return {
    // MySQL DATE รับเฉพาะ YYYY-MM-DD (ข้อมูลที่โหลดจาก server อาจเป็น ISO string)
    surveyDate: typeof payload.surveyDate === 'string' ? payload.surveyDate.slice(0, 10) : payload.surveyDate,
    projectName: payload.projectName,
    floors: payload.floors,
    visitType: normalizeClientVisitType(payload.visitType),
    status: payload.status,
    notes: payload.notes,
    surveyedBy: undefined,
    // MySQL DATETIME ไม่รับ 'T' และ 'Z'
    submittedAt: payload.status === 'submitted' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    contacts: [
      { seq: 1, ...(payload.contact1 || {}) },
      { seq: 2, ...(payload.contact2 || {}) },
    ].filter((c: any) => c.name || c.phone || c.position),
    location: payload.location ? {
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      address: payload.location.address,
      subdistrict: payload.location.subdistrict,
      district: payload.location.district,
      province: payload.location.province,
      postalCode: payload.location.postalCode,
      postalCodeId: (payload.location as any).postalCodeId ?? null,
      country: payload.location.country ?? 'TH',
    } : undefined,
    // normalize fcp power status on client to avoid sending unexpected values to server
    fcp: payload.fcpBrand || payload.fcpModel || payload.fcpType || payload.fcpMaterial || payload.fcpStatus || payload.fcpOverview || payload.fcpNameplate || payload.fcpInside ? {
      overviewFileId: fileIdFromUrl(payload.fcpOverview),
      nameplateFileId: fileIdFromUrl(payload.fcpNameplate),
      insideFileId: fileIdFromUrl(payload.fcpInside),
      brand: payload.fcpBrand,
      model: payload.fcpModel,
      type: payload.fcpType,
      material: payload.fcpMaterial,
      status: normalizeClientFcpPowerStatus(payload.fcpStatus),
    } : undefined,
    equipment: (payload.equipment || []).map((e: any) => ({
      equipmentTypeId: e.equipmentTypeId ?? null,
      customName: e.customName ?? (e.name ?? null),
      isPresent: e.status === 'yes',
      model: e.model ?? null,
      photoFileId: fileIdFromUrl(e.photo),
      qty: typeof e.qty === 'number' ? e.qty : (e.qty ? Number(e.qty) : null),
    })),
  }
}

const SINGLE_FILE_KEYS = ['signPhoto', 'fcpOverview', 'fcpNameplate', 'fcpInside']

/** สร้าง FormData (ถ้ามีไฟล์แนบ) */
export function buildFormData(bodyPayload: any, filesMap: Record<string, File | null>) {
  const form = new FormData()
  let hasFiles = false
  form.append('payload', JSON.stringify(bodyPayload))

  for (const k of SINGLE_FILE_KEYS) {
    const f = filesMap[k]
    if (f) { form.append(k, f); hasFiles = true }
  }
  // equipment files: equip-<idx>
  for (const key of Object.keys(filesMap)) {
    const f = filesMap[key]
    if (key.startsWith('equip-') && f) { form.append(key, f); hasFiles = true }
  }
  return { form, hasFiles }
}
