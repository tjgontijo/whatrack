import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findCampaignStatus(campaignId: string, organizationId: string) {
  return prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { status: true },
  })
}

export async function groupCampaignRecipientsByStatus(campaignId: string) {
  return prisma.whatsAppCampaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  })
}
