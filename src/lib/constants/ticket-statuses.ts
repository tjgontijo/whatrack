export const TICKET_STATUSES = ['open', 'closed_won', 'closed_lost'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const CLOSED_STATUSES: TicketStatus[] = ['closed_won', 'closed_lost']

export function isClosedStatus(status: string): boolean {
  return CLOSED_STATUSES.includes(status as TicketStatus)
}
