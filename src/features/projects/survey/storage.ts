import type { Survey } from './types'

const KEY = 'survey_v1'

export function loadSurveys(): Survey[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const sample: Survey[] = [
        {
          id: 'survey-sample-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
          surveyDate: new Date().toISOString().slice(0, 10),
          projectName: 'โรงพยาบาลกรุงเทพ พหลโยธิน',
          province: 'กรุงเทพมหานคร',
          floors: 12,
          contact1: { name: 'นายสมชาย ใจดี', position: 'หัวหน้างาน', phone: '0812345678' },
          contact2: { name: 'นางสาวสุนิสา อยู่ดี', position: 'เจ้าหน้าที่', phone: '0898765432' },
          visitType: 'contact_new',
          signPhoto: null,
          fcpBrand: 'Firenet',
          fcpModel: 'FN-8000',
          fcpType: 'Addressable',
          fcpMaterial: 'Metal',
          fcpStatus: 'on',
          fcpOverview: null,
          fcpNameplate: null,
          fcpInside: null,
          equipment: [
            { name: 'Graphic Annunciator', status: 'yes', model: 'GA-200', qty: 1, photo: null },
            { name: 'Smoke Detector', status: 'yes', model: 'SD-100', qty: 24, photo: null },
            { name: 'Heat Detector', status: 'no' },
            { name: 'Manual Detector', status: 'yes', model: 'MD-10', qty: 6, photo: null },
          ],
          notes: 'สถานที่ติดตั้ง FCP ชั้น G ใกล้ทางเข้า',
        },
        {
          id: 'survey-sample-2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'submitted',
          surveyDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
          projectName: 'ศูนย์การค้า เซ็นทรัลพลาซา',
          province: 'นนทบุรี',
          floors: 6,
          contact1: { name: 'นายวิทยา แสนสุข', position: 'ผู้จัดการอาคาร', phone: '0823456789' },
          contact2: { name: 'นางสาวเอมอร', position: 'เจ้าหน้าที่ความปลอดภัย', phone: '0865432198' },
          visitType: 'ref_doc',
          signPhoto: null,
          fcpBrand: 'AlertPro',
          fcpModel: 'AP-350',
          fcpType: 'Conventional',
          fcpMaterial: 'Plastic',
          fcpStatus: 'off',
          fcpOverview: null,
          fcpNameplate: null,
          fcpInside: null,
          equipment: [
            { name: 'Alarm Bell', status: 'yes', model: 'AB-50', qty: 12, photo: null },
            { name: 'Module Box', status: 'yes', model: 'MB-1', qty: 2, photo: null },
          ],
          notes: 'ระบบบางจุดต้องตรวจสอบสายภายในตู้',
        },
      ]
      try { localStorage.setItem(KEY, JSON.stringify(sample)) } catch {}
      return sample
    }
    return JSON.parse(raw) as Survey[]
  } catch { return [] }
}

export function saveSurveys(list: Survey[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function saveSurvey(survey: Survey) {
  const all = loadSurveys()
  const idx = all.findIndex((s) => s.id === survey.id)
  if (idx >= 0) { all[idx] = survey } else { all.unshift(survey) }
  saveSurveys(all)
}

export function deleteSurvey(id: string) {
  const all = loadSurveys().filter((s) => s.id !== id)
  saveSurveys(all)
}
