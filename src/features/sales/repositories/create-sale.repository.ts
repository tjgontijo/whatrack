import 'server-only'

import { saleWithItemsSelect } from '@/features/sales/repositories/shared'
import { prisma } from '@/lib/db/prisma'

export async function createSaleRepository(input: {
  organizationId: string
  projectId: string | null
  userId?: string
  totalAmount: number
  profit?: number
  discount?: number
  status?: 'pending' | 'completed' | 'cancelled'
  notes?: string
  items?: Array<{
    itemId?: string
    name: string
    quantity: number
    unitPrice: number
  }>
}) {
  return prisma.sale.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      totalAmount: input.totalAmount,
      profit: input.profit,
      discount: input.discount,
      status: input.status || 'pending',
      notes: input.notes,
      createdBy: input.userId,
      items: input.items
        ? {
            create: input.items.map((item) => ({
              organizationId: input.organizationId,
              itemId: item.itemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          }
        : undefined,
    },
    select: saleWithItemsSelect,
  })
}
