import "server-only"
import { prisma } from '@/lib/db/prisma'

interface GetConversationDealParams {
  organizationId: string
  projectId?: string
  conversationId: string
}

export async function getConversationOpenDeal(params: GetConversationDealParams) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.conversationId,
      organizationId: params.organizationId,
      projectId: params.projectId ?? undefined,
    },
    select: {
      id: true,
    },
  })

  if (!conversation) {
    return { error: 'Conversa não encontrada' as const, status: 404 as const }
  }

  const deal = await prisma.deal.findFirst({
    where: {
      conversationId: params.conversationId,
      organizationId: params.organizationId,
      projectId: params.projectId ?? undefined,
      status: { name: 'open' },
    },
    select: {
      id: true,
      status: { select: { id: true, name: true } },
      windowOpen: true,
      windowExpiresAt: true,
      dealValue: true,
      stage: {
        select: {
          id: true,
          name: true,
          color: true,
          order: true,
          isClosed: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      tracking: {
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          sourceType: true,
          ctwaclid: true,
          referrerUrl: true,
          landingPage: true,
        },
      },
      closedReason: true,
      closedAt: true,
      messagesCount: true,
      inboundMessagesCount: true,
      outboundMessagesCount: true,
      firstResponseTimeSec: true,
      resolutionTimeSec: true,
      createdAt: true,
      conversation: {
        select: {
          lead: {
            select: {
              totalDeals: true,
              lifetimeValue: true,
              firstMessageAt: true,
            },
          },
        },
      },
    },
  })

  if (!deal) {
    return { data: null, status: 404 as const }
  }

  return {
    data: {
      id: deal.id,
      status: deal.status.name,
      windowOpen: deal.windowOpen,
      windowExpiresAt: deal.windowExpiresAt?.toISOString() || null,
      dealValue: deal.dealValue ? deal.dealValue.toString() : null,
      stage: deal.stage,
      assignee: deal.assignee,
      tracking: deal.tracking,
      closedReason: deal.closedReason,
      closedAt: deal.closedAt?.toISOString() || null,
      kpis: {
        messagesCount: deal.messagesCount,
        inboundMessagesCount: deal.inboundMessagesCount,
        outboundMessagesCount: deal.outboundMessagesCount,
        firstResponseTimeSec: deal.firstResponseTimeSec,
        resolutionTimeSec: deal.resolutionTimeSec,
        createdAt: deal.createdAt.toISOString(),
      },
      leadInsights: {
        totalDeals: deal.conversation.lead.totalDeals,
        lifetimeValue: deal.conversation.lead.lifetimeValue
          ? deal.conversation.lead.lifetimeValue.toString()
          : '0',
        firstMessageAt: deal.conversation.lead.firstMessageAt?.toISOString() || null,
      },
    },
    status: 200 as const,
  }
}
