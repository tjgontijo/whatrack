import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function findSaleForUpdateRepository(input: {
  organizationId: string
  saleId: string
  projectId?: string | null
}) {
  return prisma.sale.findFirst({
    where: {
      id: input.saleId,
      organizationId: input.organizationId,
      projectId: input.projectId ?? undefined,
    },
    select: {
      id: true,
      status: true,
      statusChangedAt: true,
    },
  })
}
