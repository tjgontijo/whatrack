import 'server-only'
import type { ItemSummary } from '@/features/items/types'
import { prisma } from '@/lib/db/prisma'

export async function updateItemRepository(input: {
  itemId: string
  name?: string
  categoryId?: string | null
  active?: boolean
  projectId?: string | null
}): Promise<ItemSummary> {
  return prisma.item.update({
    where: { id: input.itemId },
    data: {
      name: input.name,
      categoryId: input.categoryId,
      active: input.active,
      ...(typeof input.projectId !== 'undefined' ? { projectId: input.projectId } : {}),
    },
    select: {
      id: true,
      organizationId: true,
      categoryId: true,
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}
