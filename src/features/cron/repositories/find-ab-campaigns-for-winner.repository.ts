import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findAbCampaignsForWinnerSelection() {
  return prisma.whatsAppCampaign.findMany({
    where: {
      isAbTest: true,
      status: { in: ['PROCESSING', 'COMPLETED'] },
    },
    select: { id: true, organizationId: true, abTestConfig: true, startedAt: true },
  })
}
