import 'server-only'

import { saleWithItemsSelect } from '@/features/sales/repositories/shared'
import { prisma } from '@/lib/db/prisma'

export async function updateSaleRepository(input: {
  saleId: string
  userId?: string
  projectId?: string | null
  totalAmount?: number
  profit?: number
  discount?: number
  status?: 'pending' | 'completed' | 'cancelled'
  notes?: string
  statusChangedAt?: Date | null
}) {
  return prisma.sale.update({
    where: { id: input.saleId },
    data: {
      totalAmount: input.totalAmount,
      profit: input.profit,
      discount: input.discount,
      status: input.status,
      notes: input.notes,
      ...(typeof input.projectId !== 'undefined' ? { projectId: input.projectId } : {}),
      updatedBy: input.userId,
      statusChangedAt: input.statusChangedAt,
    },
    select: saleWithItemsSelect,
  })
}
