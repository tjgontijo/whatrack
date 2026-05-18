import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findCampaignAbConfig(campaignId: string, organizationId: string) {
  return prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { isAbTest: true, abTestConfig: true, status: true, startedAt: true },
  })
}
