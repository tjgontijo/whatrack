import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function findItemCategoryDeleteContextRepository(input: {
  organizationId: string
  categoryId: string
}) {
  return prisma.itemCategory.findFirst({
    where: { id: input.categoryId, organizationId: input.organizationId },
    select: { id: true, _count: { select: { items: true } } },
  })
}
