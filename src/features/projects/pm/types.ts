import type { Translations } from '../../../locales'

export type DocStatus = 'planning' | 'active' | 'on_hold' | 'done' | 'cancelled'
export type ProjectTypeId = number
export type ProjectTranslations = Translations['features']['projects']
export type CommonTranslations = Translations['common']

export interface ApiProjectType {
  id: number
  name: string
  slug: string
  departmentId: number | null
  isActive: boolean
}

export interface ApiProjectItem {
  encryptedId: string
  projectTypeId: number
  projectName: string | null
  projectDescription: string | null
  projectStatus: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | null
  siteAddress: string | null
  siteLat: number | null
  siteLon: number | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  projectManagerName: string | null
  customerName: string | null
  status: 'draft' | 'approved' | 'archived'
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
  uploadedBy: string | null
  sizeBytes: number | string | null
  lastModifiedBy: string | null
  operatorNames: string | null
}

export interface ProjectItem {
  encryptedId: string
  projectTypeId: number
  name: string
  projectDescription: string
  projectStatus: ApiProjectItem['projectStatus']
  siteAddress: string
  latitude: string
  longitude: string
  plannedStartDate: string
  plannedEndDate: string
  status: DocStatus
  statusLabel: string
  size: string
  sizeBytes: number
  ownerName: string
  ownerInitials: string
  projectManagerName: string
  customerName: string
  operatorNames: string[]
  uploadedBy: string
  updatedAt: string
  createdAt: string
  lastModifiedBy: string
}
