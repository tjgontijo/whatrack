import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function findSaleForDeleteRepository(input: {
  organizationId: string
  projectId?: string | null
  saleId: string
}) {
  return prisma.sale.findFirst({
    where: {
      id: input.saleId,
      organizationId: input.organizationId,
      projectId: input.projectId ?? undefined,
    },
    select: { id: true },
  })
}
