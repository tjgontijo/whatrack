import 'server-only'
import type { ItemCategoryWithCount } from '@/features/item-categories/types'
import { prisma } from '@/lib/db/prisma'

export async function getItemCategoryByIdRepository(input: {
  organizationId: string
  categoryId: string
}): Promise<ItemCategoryWithCount | null> {
  return prisma.itemCategory.findFirst({
    where: { id: input.categoryId, organizationId: input.organizationId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      project: { select: { id: true, name: true } },
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  })
}
