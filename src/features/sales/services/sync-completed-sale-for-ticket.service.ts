import 'server-only'

import type { Prisma } from '@generated/prisma/client'

import { syncCompletedSaleForTicketRepository } from '@/features/sales/repositories'

export async function syncCompletedSaleForTicketService(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    ticketId: string
    totalAmount: number
    notes?: string
    projectId?: string | null
  }
) {
  return syncCompletedSaleForTicketRepository(tx, input)
}
