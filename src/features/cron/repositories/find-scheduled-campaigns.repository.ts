import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findScheduledCampaignsDue(now: Date) {
  return prisma.whatsAppCampaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    select: { id: true, organizationId: true },
  })
}
