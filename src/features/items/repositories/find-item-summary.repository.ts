import 'server-only'
import type { ItemSummary } from '@/features/items/types'
import { prisma } from '@/lib/db/prisma'

export async function findItemSummaryRepository(input: {
  organizationId: string
  itemId: string
}): Promise<Pick<ItemSummary, 'id' | 'active'> | null> {
  return prisma.item.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
    select: { id: true, active: true },
  })
}
