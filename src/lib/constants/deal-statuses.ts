export const DEAL_STATUSES = ['open', 'closed_won', 'closed_lost'] as const
export type DealStatus = (typeof DEAL_STATUSES)[number]

export const CLOSED_STATUSES: DealStatus[] = ['closed_won', 'closed_lost']

export function isClosedStatus(status: string): boolean {
  return CLOSED_STATUSES.includes(status as DealStatus)
}
