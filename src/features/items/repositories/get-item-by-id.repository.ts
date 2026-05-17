import 'server-only'
import { prisma } from '@/lib/db/prisma'
import type { ItemWithCategoryAndCount } from '@/features/items/types'

export async function getItemByIdRepository(input: {
  organizationId: string
  itemId: string
}): Promise<ItemWithCategoryAndCount | null> {
  return prisma.item.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
    select: {
      id: true,
      organizationId: true,
      categoryId: true,
      projectId: true,
      project: { select: { id: true, name: true } },
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          organizationId: true,
          name: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: { select: { saleItems: true } },
    },
  })
}
