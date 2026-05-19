import type { DealDateRangeFilter, DealStatusFilter } from '@/features/deals/types'

export const DEALS_QUERY_KEY = ['deals'] as const

export const DEAL_STATUS_OPTIONS: Array<{ value: DealStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'open', label: 'Abertos' },
  { value: 'closed_won', label: 'Ganhos' },
  { value: 'closed_lost', label: 'Perdidos' },
]

export const DEAL_DATE_RANGE_OPTIONS: Array<{ value: DealDateRangeFilter; label: string }> = [
  { value: 'all', label: 'Todas as datas' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
]

export const DEAL_STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  open: { label: 'Aberto', variant: 'default' },
  closed_won: { label: 'Ganho', variant: 'secondary' },
  closed_lost: { label: 'Perdido', variant: 'destructive' },
}
