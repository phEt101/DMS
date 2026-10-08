/** สร้าง payload ตามรูปแบบที่ backend ต้องการ */
export function buildBodyPayload(payload: any): any {
  return {
    surveyDate: payload.surveyDate,
    projectName: payload.projectName,
    floors: payload.floors,
    visitType: payload.visitType,
    status: payload.status,
    notes: payload.notes,
    surveyedBy: undefined,
    submittedAt: payload.status === 'submitted' ? new Date().toISOString() : null,
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
    fcp: payload.fcpBrand || payload.fcpModel || payload.fcpType || payload.fcpMaterial || payload.fcpStatus ? {
      brand: payload.fcpBrand,
      model: payload.fcpModel,
      type: payload.fcpType,
      material: payload.fcpMaterial,
      status: payload.fcpStatus,
    } : undefined,
    equipment: (payload.equipment || []).map((e: any) => ({
      equipmentTypeId: e.equipmentTypeId ?? null,
      customName: e.customName ?? (e.name ?? null),
      isPresent: e.status === 'yes',
      model: e.model ?? null,
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
