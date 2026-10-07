export type SurveyStatus = 'draft' | 'submitted'

export interface Contact {
  name: string
  position?: string
  phone?: string
}

export interface EquipmentItem {
  name: string
  status: 'no' | 'yes'
  model?: string
  qty?: number
  photo?: string | null
}

export interface Survey {
  id: string
  createdAt: string
  updatedAt: string
  status: SurveyStatus
  surveyDate: string
  projectName: string
  province: string
  floors?: number
  contact1?: Contact
  contact2?: Contact
  visitType?: string
  signPhoto?: string | null
  fcpBrand?: string
  fcpModel?: string
  fcpType?: string
  fcpMaterial?: string
  fcpStatus?: 'on' | 'off' | ''
  fcpOverview?: string | null
  fcpNameplate?: string | null
  fcpInside?: string | null
  equipment: EquipmentItem[]
  notes?: string
  location?: {
    latitude: number
    longitude: number
    address?: string
    subdistrict?: string
    district?: string
    province?: string
    postalCode?: string
    country?: string
  }
}
