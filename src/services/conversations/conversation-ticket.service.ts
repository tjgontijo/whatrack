import { prisma } from '@/lib/db/prisma'

interface GetConversationTicketParams {
  organizationId: string
  conversationId: string
}

export async function getConversationOpenTicket(params: GetConversationTicketParams) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.conversationId,
      lead: {
        organizationId: params.organizationId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!conversation) {
    return { error: 'Conversa não encontrada' as const, status: 404 as const }
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      conversationId: params.conversationId,
      organizationId: params.organizationId,
      status: 'open',
    },
    select: {
      id: true,
      status: true,
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
              totalTickets: true,
              lifetimeValue: true,
              firstMessageAt: true,
            },
          },
        },
      },
    },
  })

  if (!ticket) {
    return { data: null, status: 404 as const }
  }

  return {
    data: {
      id: ticket.id,
      status: ticket.status,
      windowOpen: ticket.windowOpen,
      windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
      dealValue: ticket.dealValue ? ticket.dealValue.toString() : null,
      stage: ticket.stage,
      assignee: ticket.assignee,
      tracking: ticket.tracking,
      closedReason: ticket.closedReason,
      closedAt: ticket.closedAt?.toISOString() || null,
      kpis: {
        messagesCount: ticket.messagesCount,
        inboundMessagesCount: ticket.inboundMessagesCount,
        outboundMessagesCount: ticket.outboundMessagesCount,
        firstResponseTimeSec: ticket.firstResponseTimeSec,
        resolutionTimeSec: ticket.resolutionTimeSec,
        createdAt: ticket.createdAt.toISOString(),
      },
      leadInsights: {
        totalTickets: ticket.conversation.lead.totalTickets,
        lifetimeValue: ticket.conversation.lead.lifetimeValue
          ? ticket.conversation.lead.lifetimeValue.toString()
          : '0',
        firstMessageAt: ticket.conversation.lead.firstMessageAt?.toISOString() || null,
      },
    },
    status: 200 as const,
  }
}
