import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'

interface ListWhatsAppChatsParams {
  organizationId: string
  q?: string
  instanceId?: string
}

export async function listWhatsAppChats(params: ListWhatsAppChatsParams) {
  const where: Prisma.LeadWhereInput = {
    organizationId: params.organizationId,
    lastMessageAt: { not: null },
    ...(params.instanceId &&
      params.instanceId !== 'all' && {
        conversations: {
          some: {
            instance: {
              id: params.instanceId,
            },
          },
        },
      }),
    ...(params.q && {
      OR: [
        { name: { contains: params.q, mode: 'insensitive' } },
        { pushName: { contains: params.q, mode: 'insensitive' } },
        { phone: { contains: params.q, mode: 'insensitive' } },
      ],
    }),
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: {
      lastMessageAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      pushName: true,
      phone: true,
      waId: true,
      profilePicUrl: true,
      lastMessageAt: true,
      conversations: {
        select: {
          id: true,
          tickets: {
            where: {
              status: 'open',
            },
            select: {
              id: true,
              status: true,
              stage: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              tracking: {
                select: {
                  sourceType: true,
                  utmSource: true,
                  ctwaclid: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        take: 1,
      },
      messages: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 1,
      },
    },
  })

  const chats = leads.map((lead) => {
    const conversation = lead.conversations[0]
    const currentTicket = conversation?.tickets[0]

    return {
      id: conversation?.id || lead.id,
      name: lead.name || lead.pushName || lead.phone,
      phone: lead.phone,
      profilePicUrl: lead.profilePicUrl,
      lastMessageAt: lead.lastMessageAt,
      lastMessage: lead.messages[0] || null,
      unreadCount: 0,
      currentTicket: currentTicket
        ? {
            id: currentTicket.id,
            status: currentTicket.status,
            stage: currentTicket.stage,
            tracking: currentTicket.tracking,
          }
        : undefined,
    }
  })

  return { items: chats }
}

interface ListChatMessagesParams {
  organizationId: string
  conversationIdOrLeadId: string
  page: number
  pageSize: number
}

export async function listWhatsAppChatMessages(params: ListChatMessagesParams) {
  const skip = (params.page - 1) * params.pageSize

  let conversation = await prisma.conversation.findFirst({
    where: {
      id: params.conversationIdOrLeadId,
      lead: {
        organizationId: params.organizationId,
      },
    },
    select: { id: true, leadId: true },
  })

  if (!conversation) {
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.conversationIdOrLeadId,
        organizationId: params.organizationId,
      },
      select: {
        id: true,
        conversations: {
          select: { id: true, leadId: true },
          take: 1,
        },
      },
    })

    if (!lead || !lead.conversations[0]) {
      return { error: 'Conversa não encontrada' as const, status: 404 as const }
    }

    conversation = lead.conversations[0]
  }

  const leadId = conversation.leadId

  const [items, total] = await Promise.all([
    prisma.message.findMany({
      where: { leadId },
      orderBy: { timestamp: 'desc' },
      skip,
      take: params.pageSize,
    }),
    prisma.message.count({ where: { leadId } }),
  ])

  return {
    data: {
      items: items.reverse(),
      total,
      page: params.page,
      pageSize: params.pageSize,
    },
  }
}
