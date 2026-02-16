import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

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

const cache = new Map<string, { ts: number; data: unknown }>()
const CACHE_TTL_MS = 3000

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const organizationId = access.organizationId
  const { searchParams } = new URL(req.url)

  const q = (searchParams.get('q') || '').trim()
  const statusFilter = (searchParams.get('status') || '').trim() || undefined
  const stageId = (searchParams.get('stageId') || '').trim() || undefined
  const assigneeId = (searchParams.get('assigneeId') || '').trim() || undefined
  const sourceType = (searchParams.get('sourceType') || '').trim() || undefined
  const utmSource = (searchParams.get('utmSource') || '').trim() || undefined
  const windowStatus = isWindowStatus(searchParams.get('windowStatus'))
    ? (searchParams.get('windowStatus') as WindowStatus)
    : undefined
  const dateRangeValue = searchParams.get('dateRange')
  const dateRangePreset = isDateRangePreset(dateRangeValue)
    ? (dateRangeValue as DateRangePreset)
    : undefined

  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(
    1,
    Math.min(100, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20),
  )

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
    const cacheKey = JSON.stringify({
      organizationId,
      q,
      statusFilter,
      stageId,
      assigneeId,
      sourceType,
      utmSource,
      windowStatus,
      dateRangePreset,
      page,
      pageSize,
      where,
    })

    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }

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

    cache.set(cacheKey, { ts: Date.now(), data: payload })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/tickets] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: String(error) },
      { status: 500 },
    )
  }
}
