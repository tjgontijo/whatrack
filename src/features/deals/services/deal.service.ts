import "server-only"
import { Prisma } from '@generated/prisma/client'
import { metaCapiService } from '@/features/meta-ads/services/capi.service'
import { syncCompletedSaleForDeal } from '@/features/sales'
import { lookupCache } from '@/lib/db/lookup-cache'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { ensureProjectBelongsToOrganization } from '@/server/project/project-scope'
import { enqueueMetaCapiEvent } from '@/server/queues/meta-capi.queue'
import { getDefaultDealStage } from './ensure-deal-stages'

export interface DealListParams {
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

export interface CreateDealParams {
  organizationId: string
  conversationId: string
  projectId?: string | null
  stageId?: string | null
  assigneeId?: string | null
  dealValue?: number | null
  createdBy: string
}

export interface UpdateDealParams {
  organizationId: string
  dealId: string
  projectId?: string | null
  stageId?: string
  assigneeId?: string | null
  dealValue?: number | null
  position?: number
}

export interface CloseDealParams {
  organizationId: string
  dealId: string
  reason: 'won' | 'lost'
  closedReason?: string
  dealValue?: number | null
}

type DealServiceError = {
  error: string
  status: 404 | 409
}

const dealListSelect = Prisma.validator<Prisma.DealSelect>()({
  id: true,
  projectId: true,
  status: { select: { id: true, name: true } },
  windowOpen: true,
  windowExpiresAt: true,
  dealValue: true,
  messagesCount: true,
  position: true,
  stageEnteredAt: true,
  createdAt: true,
  conversation: {
    select: {
      lead: {
        select: { id: true, name: true, phone: true, pushName: true },
      },
    },
  },
  stage: {
    select: {
      id: true,
      name: true,
      color: true,
      metaRules: {
        select: {
          pixelId: true,
          eventName: true,
          fireOnce: true,
        },
      },
    },
  },
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

type DealListRecord = Prisma.DealGetPayload<{ select: typeof dealListSelect }>

const dealSummarySelect = Prisma.validator<Prisma.DealSelect>()({
  id: true,
  projectId: true,
  status: { select: { id: true, name: true } },
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
  stage: {
    select: {
      id: true,
      name: true,
      color: true,
      metaRules: {
        select: {
          pixelId: true,
          eventName: true,
          fireOnce: true,
        },
      },
    },
  },
  assignee: { select: { id: true, name: true } },
  tracking: { select: { utmSource: true, sourceType: true, ctwaclid: true } },
  project: { select: { id: true, name: true } },
})

type DealSummaryRecord = Prisma.DealGetPayload<{ select: typeof dealSummarySelect }>

const dealCloseSelect = Prisma.validator<Prisma.DealSelect>()({
  ...dealSummarySelect,
  closedAt: true,
  closedReason: true,
  _count: { select: { sales: true } },
})

type DealCloseRecord = Prisma.DealGetPayload<{ select: typeof dealCloseSelect }>

const dealDetailsSelect = Prisma.validator<Prisma.DealSelect>()({
  id: true,
  projectId: true,
  conversationId: true,
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

type DealDetailsRecord = Prisma.DealGetPayload<{ select: typeof dealDetailsSelect }>

function buildWhereFilters(params: DealListParams): Prisma.DealWhereInput {
  const filters: Prisma.DealWhereInput[] = []

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

  const base: Prisma.DealWhereInput = { organizationId: params.organizationId }
  if (filters.length === 0) return base
  return { AND: [base, ...filters] }
}

function mapDealListItem(deal: DealListRecord) {
  return {
    id: deal.id,
    lead: {
      id: deal.conversation.lead.id,
      name: deal.conversation.lead.name,
      phone: deal.conversation.lead.phone,
      pushName: deal.conversation.lead.pushName,
    },
    stage: deal.stage,
    assignee: deal.assignee,
    tracking: deal.tracking
      ? {
          utmSource: deal.tracking.utmSource ?? null,
          sourceType: deal.tracking.sourceType ?? null,
          ctwaclid: deal.tracking.ctwaclid ?? null,
        }
      : null,
    project: deal.project
      ? {
          id: deal.project.id,
          name: deal.project.name,
        }
      : null,
    status: deal.status.name,
    windowOpen: deal.windowOpen,
    windowExpiresAt: deal.windowExpiresAt ? deal.windowExpiresAt.toISOString() : null,
    dealValue: deal.dealValue ? Number(deal.dealValue) : null,
    messagesCount: deal.messagesCount,
    position: deal.position,
    salesCount: deal._count.sales,
    stageEnteredAt: deal.stageEnteredAt ? deal.stageEnteredAt.toISOString() : null,
    createdAt: deal.createdAt.toISOString(),
    lastMessageAt: deal.messages[0]?.timestamp
      ? deal.messages[0].timestamp.toISOString()
      : null,
  }
}

function mapDealSummary(deal: DealSummaryRecord) {
  return {
    id: deal.id,
    lead: deal.conversation.lead,
    stage: deal.stage,
    assignee: deal.assignee,
    tracking: deal.tracking,
    project: deal.project
      ? {
          id: deal.project.id,
          name: deal.project.name,
        }
      : null,
    status: deal.status.name,
    windowOpen: deal.windowOpen,
    windowExpiresAt: deal.windowExpiresAt?.toISOString() || null,
    dealValue: deal.dealValue ? Number(deal.dealValue) : null,
    messagesCount: deal.messagesCount,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  }
}

function mapClosedDeal(deal: DealCloseRecord) {
  return {
    id: deal.id,
    lead: deal.conversation.lead,
    stage: deal.stage,
    assignee: deal.assignee,
    tracking: deal.tracking,
    project: deal.project
      ? {
          id: deal.project.id,
          name: deal.project.name,
        }
      : null,
    status: deal.status.name,
    windowOpen: deal.windowOpen,
    windowExpiresAt: deal.windowExpiresAt?.toISOString() || null,
    dealValue: deal.dealValue ? Number(deal.dealValue) : null,
    closedAt: deal.closedAt?.toISOString() || null,
    closedReason: deal.closedReason,
    messagesCount: deal.messagesCount,
    salesCount: deal._count.sales,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  }
}

async function triggerStageCapiEvents(input: {
  dealId: string
  stageId?: string
  previousStageId: string
  dealValue: number | null
  metaRules: Array<{ pixelId: string; eventName: string; fireOnce: boolean }>
}) {
  if (!input.stageId || input.stageId === input.previousStageId) {
    return
  }

  if (!input.metaRules.length) {
    return
  }

  for (const rule of input.metaRules) {
    await enqueueMetaCapiEvent({
      dealId: input.dealId,
      pixelId: rule.pixelId,
      eventName: rule.eventName,
      fireOnce: rule.fireOnce,
      dealValue: input.dealValue ?? undefined,
    }).catch((error) =>
      logger.error(
        { err: error, dealId: input.dealId, pixelId: rule.pixelId },
        `[CAPI] Failed to enqueue event ${rule.eventName}`
      )
    )
  }
}

export async function listDeals(params: DealListParams) {
  const where = buildWhereFilters(params)
  const statsWhere = buildWhereFilters({ ...params, status: undefined })

  const whereWithStatus: Prisma.DealWhereInput = params.status
    ? { AND: [where, { status: { name: params.status } }] }
    : where

  const [deals, total, openCount, closedWonCount, closedLostCount, totalDealValue, stageAggr] =
    await prisma.$transaction([
      prisma.deal.findMany({
        where: whereWithStatus,
        orderBy: { position: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: dealListSelect,
      }),
      prisma.deal.count({ where: whereWithStatus }),
      prisma.deal.count({ where: { AND: [statsWhere, { status: { name: 'open' } }] } }),
      prisma.deal.count({ where: { AND: [statsWhere, { status: { name: 'closed_won' } }] } }),
      prisma.deal.count({ where: { AND: [statsWhere, { status: { name: 'closed_lost' } }] } }),
      prisma.deal.aggregate({
        where: { AND: [statsWhere, { status: { name: 'closed_won' } }] },
        _sum: { dealValue: true },
      }),
      prisma.deal.groupBy({
        by: ['stageId'],
        where: statsWhere,
        _count: { _all: true },
        _sum: { dealValue: true },
        orderBy: { stageId: 'asc' },
      }),
    ])

  const stageStats = stageAggr.reduce(
    (acc, curr: any) => {
      acc[curr.stageId] = {
        count: curr._count?._all ?? 0,
        dealValueSum: curr._sum?.dealValue ? Number(curr._sum.dealValue) : 0,
      }
      return acc
    },
    {} as Record<string, { count: number; dealValueSum: number }>
  )

  return {
    items: deals.map(mapDealListItem),
    total,
    stats: {
      open: openCount,
      closed_won: closedWonCount,
      closed_lost: closedLostCount,
      totalDealValue: totalDealValue._sum.dealValue ? Number(totalDealValue._sum.dealValue) : 0,
      stageStats,
    },
  }
}

export async function getDealById(dealId: string, organizationId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    select: dealDetailsSelect,
  })

  if (!deal) return null

  const details: DealDetailsRecord = deal

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

export async function createDeal(params: CreateDealParams) {
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

  const existing = await prisma.deal.findFirst({
    where: { conversationId, status: { name: 'open' } },
    select: { id: true },
  })
  if (existing) {
    return {
      error: 'Conversa já possui um deal aberto',
      dealId: existing.id,
      status: 409 as const,
    }
  }

  const requestedStageId = stageId ?? undefined
  let targetStageId: string
  if (!requestedStageId) {
    const defaultStage = await getDefaultDealStage(prisma, organizationId)
    targetStageId = defaultStage.id
  } else {
    const stage = await prisma.dealStage.findFirst({
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

  const [openStatusId, maxPosResult] = await Promise.all([
    lookupCache.getDealStatusId('open'),
    prisma.deal.aggregate({
      where: { stageId: targetStageId },
      _max: { position: true },
    }),
  ])
  const initialPosition = (maxPosResult._max.position ?? 0) + 65536

  const deal = await prisma.deal.create({
    data: {
      organizationId,
      projectId:
        typeof params.projectId !== 'undefined'
          ? params.projectId
          : conversation.instance.projectId,
      leadId: conversation.leadId,
      conversationId,
      stageId: targetStageId,
      statusId: openStatusId,
      stageEnteredAt: new Date(),
      assigneeId: assigneeId || null,
      dealValue,
      position: initialPosition,
      windowOpen: true,
      windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy,
      source: 'api',
      originatedFrom: 'existing',
    },
    select: dealSummarySelect,
  })

  const summary = mapDealSummary(deal)

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

export async function updateDeal(params: UpdateDealParams) {
  const { organizationId, dealId, stageId, assigneeId, dealValue, position } = params

  const existing = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { stageId: true, status: { select: { name: true } } },
  })
  if (!existing) return { error: 'Deal não encontrado', status: 404 as const }
  if (existing.status.name !== 'open') {
    return { error: 'Deal já está fechado', status: 409 as const }
  }

  if (params.projectId) {
    const project = await ensureProjectBelongsToOrganization(organizationId, params.projectId)
    if (!project) {
      return { error: 'Projeto não encontrado', status: 404 as const }
    }
  }

  if (stageId) {
    const stage = await prisma.dealStage.findFirst({
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

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: {
      ...(stageId && { stageId, stageEnteredAt: new Date() }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(dealValue !== undefined && { dealValue }),
      ...(typeof params.projectId !== 'undefined' ? { projectId: params.projectId } : {}),
      ...(position !== undefined && { position }),
    },
    select: dealSummarySelect,
  })

  return {
    data: mapDealSummary(updated),
    previousStageId: existing.stageId,
    status: 200 as const,
  }
}

export async function updateDealAndTrackCapi(params: UpdateDealParams) {
  const result = await updateDeal(params)
  if ('error' in result) {
    return result
  }

  triggerStageCapiEvents({
    dealId: params.dealId,
    stageId: params.stageId,
    previousStageId: result.previousStageId,
    dealValue: result.data.dealValue,
    metaRules: result.data.stage.metaRules,
  })

  return result
}

export async function closeDeal(params: CloseDealParams) {
  const existing = await prisma.deal.findFirst({
    where: { id: params.dealId, organizationId: params.organizationId },
    select: {
      id: true,
      status: { select: { name: true } },
      createdAt: true,
      leadId: true,
      projectId: true,
    },
  })

  if (!existing) {
    return { error: 'Deal não encontrado', status: 404 as const }
  }

  if (existing.status.name !== 'open') {
    return {
      error: 'Deal já está fechado',
      currentStatus: existing.status.name,
      status: 409 as const,
    }
  }

  const newStatusName = params.reason === 'won' ? 'closed_won' : 'closed_lost'
  const newStatusId = await lookupCache.getDealStatusId(newStatusName)

  const closed = await prisma.$transaction(async (tx) => {
    const now = new Date()
    const resolutionTimeSec = Math.floor((now.getTime() - existing.createdAt.getTime()) / 1000)

    if (
      newStatusName === 'closed_won' &&
      typeof params.dealValue === 'number' &&
      params.dealValue > 0
    ) {
      await syncCompletedSaleForDeal(tx, {
        organizationId: params.organizationId,
        dealId: params.dealId,
        totalAmount: params.dealValue,
        notes: params.closedReason,
        projectId: existing.projectId,
      })
    }

    const updatedDeal = await tx.deal.update({
      where: { id: params.dealId },
      data: {
        statusId: newStatusId,
        closedAt: now,
        closedReason: params.closedReason,
        resolutionTimeSec,
        ...(params.dealValue !== undefined && { dealValue: params.dealValue }),
      },
      select: dealCloseSelect,
    })

    if (
      newStatusName === 'closed_won' &&
      typeof params.dealValue === 'number' &&
      params.dealValue > 0
    ) {
      await tx.lead.update({
        where: { id: existing.leadId },
        data: {
          lifetimeValue: { increment: params.dealValue },
          totalDeals: { increment: 1 },
        },
      })
    } else {
      await tx.lead.update({
        where: { id: existing.leadId },
        data: {
          totalDeals: { increment: 1 },
        },
      })
    }

    return updatedDeal
  })

  return {
    data: mapClosedDeal(closed),
    status: 200 as const,
  }
}
