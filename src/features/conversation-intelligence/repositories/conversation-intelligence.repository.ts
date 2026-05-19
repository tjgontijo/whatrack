import 'server-only'
import { prisma } from '@/lib/db/prisma'

export async function findConversationIntelligenceContext(params: {
  organizationId: string
  conversationId: string
}) {
  const { organizationId, conversationId } = params

  const [conversation, deal] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: {
        id: true,
        avgResponseTimeSec: true,
      },
    }),
    prisma.deal.findFirst({
      where: {
        conversationId,
        organizationId,
        status: { name: 'open' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        stageEnteredAt: true,
        windowOpen: true,
        windowExpiresAt: true,
        messagesCount: true,
        inboundMessagesCount: true,
        outboundMessagesCount: true,
        firstResponseTimeSec: true,
        lastInboundAt: true,
        lastOutboundAt: true,
        tracking: {
          select: {
            sourceType: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            utmContent: true,
            utmTerm: true,
            ctwaclid: true,
            gclid: true,
            fbclid: true,
            referrerUrl: true,
            landingPage: true,
            metaAdName: true,
            metaAdSetName: true,
            metaCampaignName: true,
          },
        },
        conversation: {
          select: {
            lead: {
              select: {
                totalDeals: true,
                lifetimeValue: true,
                firstMessageAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    }),
  ])

  return { conversation, deal }
}
