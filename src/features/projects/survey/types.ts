export type SurveyStatus = 'draft' | 'submitted'

export interface Contact {
  seq?: number
  name: string
  position?: string
  phone?: string
}

export interface EquipmentItem {
  id?: string
  equipmentTypeId?: string
  typeName?: string | null
  customName?: string | null
  isPresent?: boolean
  name?: string
  model?: string
  qty?: number
  photo?: string | null
  photoFileId?: number | null
  // legacy compatibility
  status?: 'no' | 'yes'
}

export interface Survey {
  id: string
  surveyNo?: string | null
  createdAt: string
  updatedAt: string
  status: SurveyStatus
  surveyDate: string
  projectName: string
  floors?: number
  visitType?: string
  notes?: string
  surveyedBy?: number | null
  submittedAt?: string | null

  // contacts
  contacts?: Contact[]
  contact1?: Contact
  contact2?: Contact

  // top-level convenience (some list endpoints include province)
  province?: string
  district?: string
  subdistrict?: string

  // photos
  signPhoto?: string | null

  // FCP
  fcpBrand?: string | null
  fcpModel?: string | null
  fcpType?: string | null
  fcpMaterial?: string | null
  fcpStatus?: 'on' | 'off' | '' | null
  fcpOverview?: string | null
  fcpNameplate?: string | null
  fcpInside?: string | null

  // equipment
  equipment?: EquipmentItem[]

  // location snapshot
  location?: {
    latitude?: number
    longitude?: number
    address?: string | null
    subdistrict?: string | null
    district?: string | null
    province?: string | null
    postalCode?: string | null
    postalCodeId?: number | null
    country?: string | null
  }
}
