import 'server-only'

import type { Prisma } from '@generated/prisma/client'

export async function syncCompletedSaleForTicketRepository(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    ticketId: string
    totalAmount: number
    notes?: string
    projectId?: string | null
  }
) {
  const existingSale = await tx.sale.findFirst({
    where: {
      organizationId: input.organizationId,
      ticketId: input.ticketId,
    },
    select: { id: true },
  })

  const saleData = {
    projectId: input.projectId ?? null,
    totalAmount: input.totalAmount,
    status: 'completed' as const,
    statusChangedAt: new Date(),
    ...(input.notes ? { notes: input.notes } : {}),
  }

  if (existingSale) {
    return tx.sale.update({
      where: { id: existingSale.id },
      data: saleData,
      select: { id: true },
    })
  }

  return tx.sale.create({
    data: {
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      ...saleData,
    },
    select: { id: true },
  })
}
