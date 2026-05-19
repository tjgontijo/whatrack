import type { DealItem } from '@/features/deals/types'

export const getDealLeadName = (deal: DealItem) =>
  deal.lead.name || deal.lead.pushName || deal.lead.phone || 'Sem nome'

export const getDealInitials = (name: string) => name.slice(0, 2).toUpperCase()

export const getDealOrigin = (deal: DealItem) =>
  deal.tracking?.utmSource || deal.tracking?.sourceType || 'Direto'

export const getDaysSince = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const isDealStale = (deal: DealItem) =>
  deal.lastMessageAt ? getDaysSince(deal.lastMessageAt) > 2 : getDaysSince(deal.createdAt) > 3

export const getDealTimeInStage = (deal: DealItem) =>
  deal.stageEnteredAt ? getDaysSince(deal.stageEnteredAt) : getDaysSince(deal.createdAt)
