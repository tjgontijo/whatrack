import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'
import { ensureProjectBelongsToOrganization } from '@/server/project/project-scope'
import { metaCapiService } from '@/services/meta-ads/capi.service'
import { syncCompletedSaleForTicket } from '@/services/sales/sale.service'
import { getDefaultTicketStage } from './ensure-ticket-stages'
import { logger } from '@/lib/utils/logger'

export interface TicketListParams {
  organizationId: string
  projectId?: string | null
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
  projectId?: string | null
  stageId?: string | null
  assigneeId?: string | null
  dealValue?: number | null
  createdBy: string
}

export interface UpdateTicketParams {
  organizationId: string
  ticketId: string
  projectId?: string | null
  stageId?: string
  assigneeId?: string | null
  dealValue?: number | null
}

export interface CloseTicketParams {
  organizationId: string
  ticketId: string
  reason: 'won' | 'lost'
  closedReason?: string
  dealValue?: number | null
}

type TicketServiceError = {
  error: string
  status: 404 | 409
}

const ticketListSelect = Prisma.validator<Prisma.TicketSelect>()({
  id: true,
  projectId: true,
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
  project: { select: { id: true, name: true } },
  messages: {
    select: { timestamp: true },
    orderBy: { timestamp: 'desc' as const },
    take: 1,
  },
  _count: { select: { sales: true } },
})

type TicketListRecord = Prisma.TicketGetPayload<{ select: typeof ticketListSelect }>

const ticketSummarySelect = Prisma.validator<Prisma.TicketSelect>()({
  id: true,
  projectId: true,
  status: true,
  windowOpen: true,
  windowExpiresAt: true,
  dealValue: true,
  messagesCount: true,
  createdAt: true,
  updatedAt: true,
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
  project: { select: { id: true, name: true } },
})

type TicketSummaryRecord = Prisma.TicketGetPayload<{ select: typeof ticketSummarySelect }>

const ticketCloseSelect = Prisma.validator<Prisma.TicketSelect>()({
  ...ticketSummarySelect,
  closedAt: true,
  closedReason: true,
  _count: { select: { sales: true } },
})

type TicketCloseRecord = Prisma.TicketGetPayload<{ select: typeof ticketCloseSelect }>

const ticketDetailsSelect = Prisma.validator<Prisma.TicketSelect>()({
  id: true,
  projectId: true,
  status: true,
  windowOpen: true,
  windowExpiresAt: true,
  dealValue: true,
  closedAt: true,
  closedReason: true,
  createdAt: true,
  updatedAt: true,
  conversation: {
    select: {
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
  project: { select: { id: true, name: true } },
  messages: {
    select: { id: true, body: true, type: true, direction: true, timestamp: true },
    orderBy: { timestamp: 'desc' as const },
    take: 10,
  },
  sales: {
    select: { id: true, totalAmount: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { messages: true, sales: true } },
})

type TicketDetailsRecord = Prisma.TicketGetPayload<{ select: typeof ticketDetailsSelect }>

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
  if (params.projectId) filters.push({ projectId: params.projectId })

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

function mapTicketListItem(ticket: TicketListRecord) {
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
    project: ticket.project
      ? {
          id: ticket.project.id,
          name: ticket.project.name,
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

function mapTicketSummary(ticket: TicketSummaryRecord) {
  return {
    id: ticket.id,
    lead: ticket.conversation.lead,
    stage: ticket.stage,
    assignee: ticket.assignee,
    tracking: ticket.tracking,
    project: ticket.project
      ? {
          id: ticket.project.id,
          name: ticket.project.name,
        }
      : null,
    status: ticket.status,
    windowOpen: ticket.windowOpen,
    windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
    dealValue: ticket.dealValue ? Number(ticket.dealValue) : null,
    messagesCount: ticket.messagesCount,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  }
}

function mapClosedTicket(ticket: TicketCloseRecord) {
  return {
    id: ticket.id,
    lead: ticket.conversation.lead,
    stage: ticket.stage,
    assignee: ticket.assignee,
    tracking: ticket.tracking,
    project: ticket.project
      ? {
          id: ticket.project.id,
          name: ticket.project.name,
        }
      : null,
    status: ticket.status,
    windowOpen: ticket.windowOpen,
    windowExpiresAt: ticket.windowExpiresAt?.toISOString() || null,
    dealValue: ticket.dealValue ? Number(ticket.dealValue) : null,
    closedAt: ticket.closedAt?.toISOString() || null,
    closedReason: ticket.closedReason,
    messagesCount: ticket.messagesCount,
    salesCount: ticket._count.sales,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  }
}

function getCapiEventForStage(stageName: string): 'LeadSubmitted' | 'Purchase' | null {
  const name = stageName.toLowerCase()
  if (name.includes('qualificado') || name.includes('qualified')) return 'LeadSubmitted'
  if (
    name.includes('venda') ||
    name.includes('pago') ||
    name.includes('ganho') ||
    name.includes('won')
  ) {
    return 'Purchase'
  }
  return null
}

function triggerStageCapiEvent(input: {
  ticketId: string
  stageId?: string
  previousStageId: string
  stageName: string
  dealValue: number | null
}) {
  if (!input.stageId || input.stageId === input.previousStageId) {
    return
  }

  const eventName = getCapiEventForStage(input.stageName)
  if (!eventName) {
    return
  }

  metaCapiService
    .sendEvent(input.ticketId, eventName, {
      eventId: `${eventName.toLowerCase()}-${input.ticketId}`,
      value: input.dealValue ?? undefined,
    })
    .catch((error) =>
      logger.error({ err: error }, `[CAPI] Fire-and-forget failed for ticket ${input.ticketId}`)
    )
}

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
        select: ticketListSelect,
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
    items: tickets.map(mapTicketListItem),
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
    select: ticketDetailsSelect,
  })

  if (!ticket) return null

  const details: TicketDetailsRecord = ticket

  return {
    id: details.id,
    lead: details.conversation.lead,
    stage: details.stage,
    assignee: details.assignee,
    tracking: details.tracking || null,
    project: details.project
      ? {
          id: details.project.id,
          name: details.project.name,
        }
      : null,
    status: details.status,
    windowOpen: details.windowOpen,
    windowExpiresAt: details.windowExpiresAt?.toISOString() || null,
    dealValue: details.dealValue ? Number(details.dealValue) : null,
    closedAt: details.closedAt?.toISOString() || null,
    closedReason: details.closedReason,
    messagesCount: details._count.messages,
    salesCount: details._count.sales,
    createdAt: details.createdAt.toISOString(),
    updatedAt: details.updatedAt.toISOString(),
    recentMessages: details.messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
    sales: details.sales.map((sale) => ({
      ...sale,
      totalAmount: sale.totalAmount ? Number(sale.totalAmount) : null,
      createdAt: sale.createdAt.toISOString(),
    })),
  }
}

export async function createTicket(params: CreateTicketParams) {
  const { organizationId, conversationId, stageId, assigneeId, dealValue, createdBy } = params

  if (params.projectId) {
    const project = await ensureProjectBelongsToOrganization(organizationId, params.projectId)
    if (!project) {
      return { error: 'Projeto não encontrado', status: 404 as const }
    }
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    select: {
      leadId: true,
      instance: {
        select: {
          projectId: true,
        },
      },
    },
  })
  if (!conversation) return { error: 'Conversa não encontrada', status: 404 as const }

  const existing = await prisma.ticket.findFirst({
    where: { conversationId, status: 'open' },
    select: { id: true },
  })
  if (existing) {
    return {
      error: 'Conversa já possui um ticket aberto',
      ticketId: existing.id,
      status: 409 as const,
    }
  }

  const requestedStageId = stageId ?? undefined
  let targetStageId: string
  if (!requestedStageId) {
    const defaultStage = await getDefaultTicketStage(prisma, organizationId)
    targetStageId = defaultStage.id
  } else {
    const stage = await prisma.ticketStage.findFirst({
      where: { id: requestedStageId, organizationId },
      select: { id: true },
    })
    if (!stage) return { error: 'Estágio não encontrado', status: 404 as const }
    targetStageId = requestedStageId
  }

  if (assigneeId) {
    const assignee = await prisma.member.findFirst({
      where: { userId: assigneeId, organizationId },
      select: { userId: true },
    })
    if (!assignee) return { error: 'Atribuído não encontrado', status: 404 as const }
  }

  const ticket = await prisma.ticket.create({
    data: {
      organizationId,
      projectId:
        typeof params.projectId !== 'undefined' ? params.projectId : conversation.instance.projectId,
      leadId: conversation.leadId,
      conversationId,
      stageId: targetStageId,
      stageEnteredAt: new Date(),
      assigneeId: assigneeId || null,
      dealValue,
      status: 'open',
      windowOpen: true,
      windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy,
      source: 'api',
      originatedFrom: 'existing',
    },
    select: ticketSummarySelect,
  })

  const summary = mapTicketSummary(ticket)

  return {
    data: {
      id: summary.id,
      lead: summary.lead,
      stage: summary.stage,
      assignee: summary.assignee,
      tracking: summary.tracking,
      status: summary.status,
      windowOpen: summary.windowOpen,
      windowExpiresAt: summary.windowExpiresAt,
      dealValue: summary.dealValue,
      messagesCount: summary.messagesCount,
      createdAt: summary.createdAt,
    },
    status: 201 as const,
  }
}

export async function updateTicket(params: UpdateTicketParams) {
  const { organizationId, ticketId, stageId, assigneeId, dealValue } = params

  const existing = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    select: { stageId: true, status: true },
  })
  if (!existing) return { error: 'Ticket não encontrado', status: 404 as const }
  if (existing.status !== 'open') {
    return { error: 'Ticket já está fechado', status: 409 as const }
  }

  if (params.projectId) {
    const project = await ensureProjectBelongsToOrganization(organizationId, params.projectId)
    if (!project) {
      return { error: 'Projeto não encontrado', status: 404 as const }
    }
  }

  if (stageId) {
    const stage = await prisma.ticketStage.findFirst({
      where: { id: stageId, organizationId },
      select: { id: true },
    })
    if (!stage) return { error: 'Estágio não encontrado', status: 404 as const }
  }

  if (assigneeId !== undefined && assigneeId !== null) {
    const assignee = await prisma.member.findFirst({
      where: { userId: assigneeId, organizationId },
      select: { userId: true },
    })
    if (!assignee) return { error: 'Atribuído não encontrado', status: 404 as const }
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(stageId && { stageId, stageEnteredAt: new Date() }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(dealValue !== undefined && { dealValue }),
      ...(typeof params.projectId !== 'undefined' ? { projectId: params.projectId } : {}),
    },
    select: ticketSummarySelect,
  })

  return {
    data: mapTicketSummary(updated),
    previousStageId: existing.stageId,
    status: 200 as const,
  }
}

export async function updateTicketAndTrackCapi(params: UpdateTicketParams) {
  const result = await updateTicket(params)
  if ('error' in result) {
    return result
  }

  triggerStageCapiEvent({
    ticketId: params.ticketId,
    stageId: params.stageId,
    previousStageId: result.previousStageId,
    stageName: result.data.stage.name,
    dealValue: result.data.dealValue,
  })

  return result
}

export async function closeTicket(params: CloseTicketParams) {
  const existing = await prisma.ticket.findFirst({
    where: { id: params.ticketId, organizationId: params.organizationId },
    select: { id: true, status: true, createdAt: true, leadId: true, projectId: true },
  })

  if (!existing) {
    return { error: 'Ticket não encontrado', status: 404 as const }
  }

  if (existing.status !== 'open') {
    return {
      error: 'Ticket já está fechado',
      currentStatus: existing.status,
      status: 409 as const,
    }
  }

  const newStatus = params.reason === 'won' ? 'closed_won' : 'closed_lost'

  const closed = await prisma.$transaction(async (tx) => {
    const now = new Date()
    const resolutionTimeSec = Math.floor((now.getTime() - existing.createdAt.getTime()) / 1000)

    if (newStatus === 'closed_won' && typeof params.dealValue === 'number' && params.dealValue > 0) {
      await syncCompletedSaleForTicket(tx, {
        organizationId: params.organizationId,
        ticketId: params.ticketId,
        totalAmount: params.dealValue,
        notes: params.closedReason,
        projectId: existing.projectId,
      })
    }

    const updatedTicket = await tx.ticket.update({
      where: { id: params.ticketId },
      data: {
        status: newStatus,
        closedAt: now,
        closedReason: params.closedReason,
        resolutionTimeSec,
        ...(params.dealValue !== undefined && { dealValue: params.dealValue }),
      },
      select: ticketCloseSelect,
    })

    if (newStatus === 'closed_won' && typeof params.dealValue === 'number' && params.dealValue > 0) {
      await tx.lead.update({
        where: { id: existing.leadId },
        data: {
          lifetimeValue: { increment: params.dealValue },
          totalTickets: { increment: 1 },
        },
      })
    } else {
      await tx.lead.update({
        where: { id: existing.leadId },
        data: {
          totalTickets: { increment: 1 },
        },
      })
    }

    return updatedTicket
  })

  return {
    data: mapClosedTicket(closed),
    status: 200 as const,
  }
}
