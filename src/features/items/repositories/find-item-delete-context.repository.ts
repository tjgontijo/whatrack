import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function findItemDeleteContextRepository(input: {
  organizationId: string
  itemId: string
}) {
  return prisma.item.findFirst({
    where: { id: input.itemId, organizationId: input.organizationId },
    select: { id: true, _count: { select: { saleItems: true } } },
  })
}
