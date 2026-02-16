import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { hasPermission } from '@/lib/auth/rbac/roles'
import { getDefaultTicketStage } from '@/services/tickets/ensure-ticket-stages'
import {
  ticketsQuerySchema,
  createTicketSchema,
} from '@/lib/validations/ticket-schemas'

const DATE_RANGE_PRESETS = ['today', '7d', '30d', 'thisMonth'] as const
type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

const WINDOW_STATUSES = ['open', 'expired'] as const
type WindowStatus = (typeof WINDOW_STATUSES)[number]

function isDateRangePreset(value: string | null): value is DateRangePreset {
  return Boolean(value && DATE_RANGE_PRESETS.includes(value as DateRangePreset))
}

function isWindowStatus(value: string | null): value is WindowStatus {
  return Boolean(value && WINDOW_STATUSES.includes(value as WindowStatus))
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function resolveDateRange(preset: DateRangePreset): { gte: Date; lte: Date } {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  if (preset === 'today') {
    return { gte: todayStart, lte: todayEnd }
  }

  if (preset.endsWith('d')) {
    const days = Number.parseInt(preset.replace('d', ''), 10)
    const from = new Date(todayStart)
    from.setDate(from.getDate() - (days - 1))
    return { gte: from, lte: todayEnd }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return { gte: monthStart, lte: todayEnd }
}

const ticketSchema = z.object({
  id: z.string(),
  lead: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    pushName: z.string().nullable(),
  }),
  stage: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }),
  assignee: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  tracking: z
    .object({
      utmSource: z.string().nullable(),
      sourceType: z.string().nullable(),
      ctwaclid: z.string().nullable(),
    })
    .nullable(),
  status: z.string(),
  windowOpen: z.boolean(),
  windowExpiresAt: z.string().nullable(),
  dealValue: z.number().nullable(),
  messagesCount: z.number(),
  salesCount: z.number(),
  createdAt: z.string(),
  lastMessageAt: z.string().nullable(),
})

const ticketsResponseSchema = z.object({
  items: z.array(ticketSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  stats: z.object({
    open: z.number().int().nonnegative(),
    closed_won: z.number().int().nonnegative(),
    closed_lost: z.number().int().nonnegative(),
    totalDealValue: z.number().nonnegative(),
  }),
})

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'view:tickets')) {
    return NextResponse.json(
      { error: 'Sem permissão para visualizar tickets' },
      { status: 403 },
    )
  }

  const organizationId = access.organizationId
  const { searchParams } = new URL(req.url)

  // Validate query parameters
  const parsed = ticketsQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    stageId: searchParams.get('stageId') ?? undefined,
    assigneeId: searchParams.get('assigneeId') ?? undefined,
    sourceType: searchParams.get('sourceType') ?? undefined,
    utmSource: searchParams.get('utmSource') ?? undefined,
    windowStatus: searchParams.get('windowStatus') ?? undefined,
    dateRange: searchParams.get('dateRange') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Parâmetros inválidos',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const {
    q,
    status: statusFilter,
    stageId,
    assigneeId,
    sourceType,
    utmSource,
    windowStatus,
    dateRange: dateRangePreset,
    page,
    pageSize,
  } = parsed.data

  const filters: Prisma.TicketWhereInput[] = []

  if (q) {
    const imode = 'insensitive' as Prisma.QueryMode
    filters.push({
      conversation: {
        lead: {
          OR: [
            { name: { contains: q, mode: imode } },
            { phone: { contains: q, mode: imode } },
            { pushName: { contains: q, mode: imode } },
            { waId: { contains: q, mode: imode } },
          ],
        },
      },
    })
  }

  if (stageId) filters.push({ stageId })
  if (assigneeId) filters.push({ assigneeId })

  if (sourceType) {
    filters.push({
      tracking: {
        sourceType,
      },
    })
  }

  if (utmSource) {
    const imode = 'insensitive' as Prisma.QueryMode
    filters.push({
      tracking: {
        utmSource: { contains: utmSource, mode: imode },
      },
    })
  }

  if (dateRangePreset) {
    const range = resolveDateRange(dateRangePreset)
    filters.push({ createdAt: { gte: range.gte, lte: range.lte } })
  }

  if (windowStatus) {
    const now = new Date()
    if (windowStatus === 'open') {
      filters.push({
        windowOpen: true,
        windowExpiresAt: { gt: now },
      })
    } else {
      filters.push({
        OR: [{ windowOpen: false }, { windowExpiresAt: { lte: now } }],
      })
    }
  }

  const baseWhere: Prisma.TicketWhereInput = { organizationId }
  const buildWhere = (extraFilters: Prisma.TicketWhereInput[]) => {
    if (extraFilters.length === 0) return baseWhere
    if (extraFilters.length === 1) return { AND: [baseWhere, extraFilters[0]] }
    return { AND: [baseWhere, ...extraFilters] }
  }

  const where = buildWhere([
    ...filters,
    ...(statusFilter ? [{ status: statusFilter }] : []),
  ])

  const statsWhere = buildWhere(filters)

  try {
    const [tickets, total, openCount, closedWonCount, closedLostCount, totalDealValue] =
      await prisma.$transaction([
        prisma.ticket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
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
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    pushName: true,
                  },
                },
              },
            },
            stage: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            assignee: {
              select: {
                id: true,
                name: true,
              },
            },
            tracking: {
              select: {
                utmSource: true,
                sourceType: true,
                ctwaclid: true,
              },
            },
            messages: {
              select: { timestamp: true },
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
            _count: {
              select: { sales: true },
            },
          },
        }),
        prisma.ticket.count({ where }),
        prisma.ticket.count({ where: { ...statsWhere, status: 'open' } }),
        prisma.ticket.count({ where: { ...statsWhere, status: 'closed_won' } }),
        prisma.ticket.count({ where: { ...statsWhere, status: 'closed_lost' } }),
        prisma.ticket.aggregate({
          where: { ...statsWhere, status: 'closed_won' },
          _sum: { dealValue: true },
        }),
      ])

    const items = tickets.map((ticket) => ({
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
    }))

    const payload = ticketsResponseSchema.parse({
      items,
      total,
      page,
      pageSize,
      stats: {
        open: openCount,
        closed_won: closedWonCount,
        closed_lost: closedLostCount,
        totalDealValue: totalDealValue._sum.dealValue
          ? Number(totalDealValue._sum.dealValue)
          : 0,
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/tickets] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  if (!hasPermission(access.role, 'manage:tickets')) {
    return NextResponse.json(
      { error: 'Sem permissão para criar tickets' },
      { status: 403 },
    )
  }

  const organizationId = access.organizationId
  const userId = access.userId

  try {
    const body = await req.json()
    const parsed = createTicketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const { conversationId, stageId, assigneeId, dealValue } = parsed.data

    // Verify conversation exists and belongs to organization
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
      },
      include: {
        lead: true,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 },
      )
    }

    // Check if conversation already has an open ticket
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        conversationId,
        status: 'open',
      },
    })

    if (existingTicket) {
      return NextResponse.json(
        {
          error: 'Conversa já possui um ticket aberto',
          ticketId: existingTicket.id,
        },
        { status: 409 },
      )
    }

    // Get stage (use provided or default)
    let targetStageId = stageId
    if (!targetStageId) {
      const defaultStage = await getDefaultTicketStage(prisma, organizationId)
      targetStageId = defaultStage.id
    } else {
      // Verify stage belongs to organization
      const stage = await prisma.ticketStage.findFirst({
        where: { id: targetStageId, organizationId },
      })
      if (!stage) {
        return NextResponse.json(
          { error: 'Estágio não encontrado' },
          { status: 404 },
        )
      }
    }

    // Verify assignee if provided
    if (assigneeId) {
      const assignee = await prisma.member.findFirst({
        where: {
          userId: assigneeId,
          organizationId,
        },
      })
      if (!assignee) {
        return NextResponse.json(
          { error: 'Atribuído não encontrado' },
          { status: 404 },
        )
      }
    }

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        organizationId,
        leadId: conversation.leadId, // ✅ Add leadId
        conversationId,
        stageId: targetStageId,
        assigneeId: assigneeId || null,
        dealValue,
        status: 'open',
        windowOpen: true,
        windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: userId || 'SYSTEM',
        // ✅ Source tracking
        source: 'api',
        originatedFrom: 'existing',
      },
      include: {
        conversation: {
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
                pushName: true,
              },
            },
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        tracking: true,
      },
    })

    // Format response
    const response = {
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
    }

    // Revalidate cache
    await revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[api/tickets] POST error:', error)
    return NextResponse.json(
      { error: 'Falha ao criar ticket', details: String(error) },
      { status: 500 },
    )
  }
}
