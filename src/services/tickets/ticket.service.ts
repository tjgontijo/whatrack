import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getDefaultTicketStage } from './ensure-ticket-stages'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketListParams {
  organizationId: string
  q?: string
  status?: string
  stageId?: string
  assigneeId?: string
  sourceType?: string
  utmSource?: string
  windowStatus?: 'open' | 'expired'
  dateRange?: { gte: Date; lte: Date }
  page: number
  pageSize: number
}

export interface CreateTicketParams {
  organizationId: string
  conversationId: string
  stageId?: string | null
  assigneeId?: string | null
  dealValue?: number | null
  createdBy: string
}

export interface UpdateTicketParams {
  organizationId: string
  ticketId: string
  stageId?: string
  assigneeId?: string | null
  dealValue?: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWhereFilters(params: TicketListParams): Prisma.TicketWhereInput {
  const filters: Prisma.TicketWhereInput[] = []

  if (params.q) {
    const imode = 'insensitive' as Prisma.QueryMode
    filters.push({
      conversation: {
        lead: {
          OR: [
            { name: { contains: params.q, mode: imode } },
            { phone: { contains: params.q, mode: imode } },
            { pushName: { contains: params.q, mode: imode } },
            { waId: { contains: params.q, mode: imode } },
          ],
        },
      },
    })
  }

  if (params.stageId) filters.push({ stageId: params.stageId })
  if (params.assigneeId) filters.push({ assigneeId: params.assigneeId })

  if (params.sourceType) {
    filters.push({ tracking: { sourceType: params.sourceType } })
  }

  if (params.utmSource) {
    filters.push({
      tracking: {
        utmSource: { contains: params.utmSource, mode: 'insensitive' as Prisma.QueryMode },
      },
    })
  }

  if (params.dateRange) {
    filters.push({ createdAt: { gte: params.dateRange.gte, lte: params.dateRange.lte } })
  }

  if (params.windowStatus) {
    const now = new Date()
    if (params.windowStatus === 'open') {
      filters.push({ windowOpen: true, windowExpiresAt: { gt: now } })
    } else {
      filters.push({ OR: [{ windowOpen: false }, { windowExpiresAt: { lte: now } }] })
    }
  }

  const base: Prisma.TicketWhereInput = { organizationId: params.organizationId }
  if (filters.length === 0) return base
  return { AND: [base, ...filters] }
}

function formatTicketItem(ticket: any) {
  return {
    id: ticket.id,
    lead: {
      id: ticket.conversation.lead.id,
      name: ticket.conversation.lead.name,
      phone: ticket.conversation.lead.phone,
      pushName: ticket.conversation.lead.pushName,
    },
    stage: ticket.stage,
    assignee: ticket.assignee,
    tracking: ticket.tracking
      ? {
        utmSource: ticket.tracking.utmSource ?? null,
        sourceType: ticket.tracking.sourceType ?? null,
        ctwaclid: ticket.tracking.ctwaclid ?? null,
      }
      : null,
    status: ticket.status,
    windowOpen: ticket.windowOpen,
    windowExpiresAt: ticket.windowExpiresAt ? ticket.windowExpiresAt.toISOString() : null,
    dealValue: ticket.dealValue ? Number(ticket.dealValue) : null,
    messagesCount: ticket.messagesCount,
    salesCount: ticket._count.sales,
    createdAt: ticket.createdAt.toISOString(),
    lastMessageAt: ticket.messages[0]?.timestamp
      ? ticket.messages[0].timestamp.toISOString()
      : null,
  }
}

// ─── Service Methods ───────────────────────────────────────────────────────────

export async function listTickets(params: TicketListParams) {
  const where = buildWhereFilters(params)
  const statsWhere = buildWhereFilters({ ...params, status: undefined })

  const whereWithStatus: Prisma.TicketWhereInput = params.status
    ? { AND: [where, { status: params.status }] }
    : where

  const [tickets, total, openCount, closedWonCount, closedLostCount, totalDealValue] =
    await prisma.$transaction([
      prisma.ticket.findMany({
        where: whereWithStatus,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          status: true,
          windowOpen: true,
          windowExpiresAt: true,
          dealValue: true,
          messagesCount: true,
          createdAt: true,
          conversation: {
            select: {
              lead: {
                select: { id: true, name: true, phone: true, pushName: true },
              },
            },
          },
          stage: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true } },
          tracking: { select: { utmSource: true, sourceType: true, ctwaclid: true } },
          messages: {
            select: { timestamp: true },
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          _count: { select: { sales: true } },
        },
      }),
      prisma.ticket.count({ where: whereWithStatus }),
      prisma.ticket.count({ where: { AND: [statsWhere, { status: 'open' }] } }),
      prisma.ticket.count({ where: { AND: [statsWhere, { status: 'closed_won' }] } }),
      prisma.ticket.count({ where: { AND: [statsWhere, { status: 'closed_lost' }] } }),
      prisma.ticket.aggregate({
        where: { AND: [statsWhere, { status: 'closed_won' }] },
        _sum: { dealValue: true },
      }),
    ])

  return {
    items: tickets.map(formatTicketItem),
    total,
    stats: {
      open: openCount,
      closed_won: closedWonCount,
      closed_lost: closedLostCount,
      totalDealValue: totalDealValue._sum.dealValue ? Number(totalDealValue._sum.dealValue) : 0,
    },
  }
}

export async function getTicketById(ticketId: string, organizationId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      conversation: {
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              pushName: true,
              profilePicUrl: true,
              waId: true,
            },
          },
        },
      },
      stage: { select: { id: true, name: true, color: true, order: true, isClosed: true } },
      assignee: { select: { id: true, name: true, email: true, image: true } },
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
      messages: {
        select: { id: true, body: true, type: true, direction: true, timestamp: true },
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
      sales: {
        select: { id: true, totalAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { messages: true, sales: true } },
    },
  })

  if (!ticket) return null

  return {
    id: ticket.id,
    lead: ticket.conversation.lead,
    stage: ticket.stage,
    assignee: ticket.assignee,
    tracking: ticket.tracking || null,
    status: ticket.status,
    windowOpen: ticket.windowOpen,
    windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
    dealValue: ticket.dealValue ? Number(ticket.dealValue) : null,
    closedAt: ticket.closedAt?.toISOString() || null,
    closedReason: ticket.closedReason,
    messagesCount: ticket._count.messages,
    salesCount: ticket._count.sales,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    recentMessages: ticket.messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    })),
    sales: ticket.sales.map((sale) => ({
      ...sale,
      totalAmount: sale.totalAmount ? Number(sale.totalAmount) : null,
      createdAt: sale.createdAt.toISOString(),
    })),
  }
}

export async function createTicket(params: CreateTicketParams) {
  const { organizationId, conversationId, stageId, assigneeId, dealValue, createdBy } = params

  // Verify conversation exists and belongs to organization
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { lead: true },
  })
  if (!conversation) return { error: 'Conversa não encontrada', status: 404 as const }

  // Check for existing open ticket
  const existing = await prisma.ticket.findFirst({
    where: { conversationId, status: 'open' },
  })
  if (existing) {
    return {
      error: 'Conversa já possui um ticket aberto',
      ticketId: existing.id,
      status: 409 as const,
    }
  }

  // Resolve stage
  let targetStageId = stageId
  if (!targetStageId) {
    const defaultStage = await getDefaultTicketStage(prisma, organizationId)
    targetStageId = defaultStage.id
  } else {
    const stage = await prisma.ticketStage.findFirst({
      where: { id: targetStageId, organizationId },
    })
    if (!stage) return { error: 'Estágio não encontrado', status: 404 as const }
  }

  // Validate assignee
  if (assigneeId) {
    const assignee = await prisma.member.findFirst({
      where: { userId: assigneeId, organizationId },
    })
    if (!assignee) return { error: 'Atribuído não encontrado', status: 404 as const }
  }

  const ticket: any = await prisma.ticket.create({
    data: {
      organizationId,
      leadId: conversation.leadId,
      conversationId,
      stageId: targetStageId!,
      assigneeId: assigneeId || null,
      dealValue,
      status: 'open',
      windowOpen: true,
      windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy,
      source: 'api',
      originatedFrom: 'existing',
    },
    include: {
      conversation: {
        include: {
          lead: { select: { id: true, name: true, phone: true, pushName: true } },
        },
      },
      stage: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true } },
      tracking: true,
    },
  })

  return {
    data: {
      id: ticket.id,
      lead: ticket.conversation.lead,
      stage: ticket.stage,
      assignee: ticket.assignee,
      tracking: ticket.tracking,
      status: ticket.status,
      windowOpen: ticket.windowOpen,
      windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
      dealValue: ticket.dealValue ? Number(ticket.dealValue) : null,
      messagesCount: ticket.messagesCount,
      createdAt: ticket.createdAt.toISOString(),
    },
    status: 201 as const,
  }
}

export async function updateTicket(params: UpdateTicketParams) {
  const { organizationId, ticketId, stageId, assigneeId, dealValue } = params

  const existing = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
  })
  if (!existing) return { error: 'Ticket não encontrado', status: 404 as const }
  if (existing.status !== 'open') {
    return { error: 'Ticket já está fechado', status: 409 as const }
  }

  if (stageId) {
    const stage = await prisma.ticketStage.findFirst({ where: { id: stageId, organizationId } })
    if (!stage) return { error: 'Estágio não encontrado', status: 404 as const }
  }

  if (assigneeId !== undefined && assigneeId !== null) {
    const assignee = await prisma.member.findFirst({
      where: { userId: assigneeId, organizationId },
    })
    if (!assignee) return { error: 'Atribuído não encontrado', status: 404 as const }
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(stageId && { stageId }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(dealValue !== undefined && { dealValue }),
    },
    include: {
      conversation: {
        include: {
          lead: { select: { id: true, name: true, phone: true, pushName: true } },
        },
      },
      stage: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true } },
      tracking: true,
    },
  })

  return {
    data: {
      id: updated.id,
      lead: updated.conversation.lead,
      stage: updated.stage,
      assignee: updated.assignee,
      tracking: updated.tracking,
      status: updated.status,
      windowOpen: updated.windowOpen,
      windowExpiresAt: updated.windowExpiresAt?.toISOString() || null,
      dealValue: updated.dealValue ? Number(updated.dealValue) : null,
      messagesCount: updated.messagesCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
    previousStageId: existing.stageId,
    status: 200 as const,
  }
}
