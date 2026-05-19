export interface MetaCapiRule {
  id: string
  pixelId: string
  eventName: string
  fireOnce: boolean
  includeEmail: boolean
  includePhone: boolean
  includeFullName: boolean
  includeAddress: boolean
  includeExternalId: boolean
}

export interface DealStage {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
  isClosed: boolean
  dealsCount: number
  statusGroup: 'ACTIVE' | 'WON' | 'LOST'
  probability: number
  metaRules: MetaCapiRule[]
}

export interface DealStageFormData {
  name: string
  color: string
  statusGroup: 'ACTIVE' | 'WON' | 'LOST'
  probability: number
  isDefault: boolean
  isClosed: boolean
  metaRules: Omit<MetaCapiRule, 'id'>[]
}
