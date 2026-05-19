import type { KanbanColumn } from '@/features/dashboard/components/crud/types'

export type DealItem = {
  id: string
  lead: {
    id: string
    name: string | null
    phone: string | null
    pushName: string | null
  }
  stage: {
    id: string
    name: string
    color: string
  }
  assignee: { id: string; name: string } | null
  tracking: {
    utmSource: string | null
    sourceType: string | null
    ctwaclid: string | null
  } | null
  project?: {
    id: string
    name: string
  } | null
  status: string
  windowOpen: boolean
  windowExpiresAt: string | null
  dealValue: number | null
  messagesCount: number
  salesCount: number
  stageEnteredAt: string | null
  createdAt: string
  lastMessageAt: string | null
}

export type DealStageStats = Record<string, { count: number; dealValueSum: number }>

export type DealStats = {
  open: number
  closed_won: number
  closed_lost: number
  totalDealValue: number
  stageStats: DealStageStats
}

export type DealStageColumn = KanbanColumn & {
  statusGroup?: 'ACTIVE' | 'WON' | 'LOST'
  suggestedMetaEventName?: string | null
  metaRules?: {
    id: string
    pixelId: string
    eventName: string
    fireOnce: boolean
  }[]
}

export type DealStagesResponse = {
  items: DealStageColumn[]
}

export type DealStatusFilter = 'all' | 'open' | 'closed_won' | 'closed_lost'
export type DealDateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'thisMonth'
