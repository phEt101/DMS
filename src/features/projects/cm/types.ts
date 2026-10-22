export type CmStatus =
  | 'reported'
  | 'awaiting_inspection'
  | 'queued'
  | 'in_progress'
  | 'awaiting_acceptance'
  | 'done'
  | 'cancelled'

export type CmPriority = 'low' | 'medium' | 'high' | 'critical'

export interface CmProject {
  id: string
  code: string
  name: string
  customer: string
  problem: string
  objective?: string
  priority: CmPriority
  problemType?: string
  status: CmStatus
  requestedDate?: string
  plannedStart?: string
  plannedEnd?: string
  responsible?: string
  location?: string
  estimatedCost?: number
  notes?: string
  createdAt: string
  updatedAt: string
}
