import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ticketsListResponseSchema } from '@/schemas/lead-tickets'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


const DATE_RANGE_PRESETS = [
  'today',
  'yesterday',
  '3d',
  '7d',
  '15d',
  '30d',
  '60d',
  '90d',
  'thisMonth',
  'lastMonth',
] as const

type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

function isDateRangePreset(value: string | null): value is DateRangePreset {
  return Boolean(value && DATE_RANGE_PRESETS.includes(value as DateRangePreset))
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

  if (preset === 'yesterday') {
    const start = new Date(todayStart)
    const end = new Date(todayEnd)
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    return { gte: start, lte: end }
  }

  if (preset.endsWith('d')) {
    const days = Number.parseInt(preset.replace('d', ''), 10)
    const from = new Date(todayStart)
    from.setDate(from.getDate() - (days - 1))
    return { gte: from, lte: todayEnd }
  }

  if (preset === 'thisMonth') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { gte: monthStart, lte: todayEnd }
  }

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
  prevMonthEnd.setMilliseconds(prevMonthEnd.getMilliseconds() - 1)

  return { gte: prevMonthStart, lte: prevMonthEnd }
}

const cache = new Map<string, { ts: number; data: unknown }>()
const CACHE_TTL_MS = 3000

let running = false
const waitQueue: Array<() => void> = []
async function serialize<T>(fn: () => Promise<T>): Promise<T> {
  if (running) await new Promise<void>((resolve) => waitQueue.push(resolve))
  running = true
  try {
    return await fn()
  } finally {
    running = false
    const next = waitQueue.shift()
    if (next) next()
  }
}

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(
    1,
    Math.min(100, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20),
  )

  const dateRangeValue = searchParams.get('dateRange')
  const dateRangePreset = isDateRangePreset(dateRangeValue) ? (dateRangeValue as DateRangePreset) : undefined
  const statusFilter = (searchParams.get('status') || '').trim() || undefined

  const ors: Prisma.TicketWhereInput[] = []

  if (q) {
    const imode = 'insensitive' as Prisma.QueryMode
    ors.push({ utmSource: { contains: q, mode: imode } })
    ors.push({ utmMedium: { contains: q, mode: imode } })
    ors.push({ utmCampaign: { contains: q, mode: imode } })
    ors.push({ utmTerm: { contains: q, mode: imode } })
    ors.push({ utmContent: { contains: q, mode: imode } })
    ors.push({ gclid: { contains: q, mode: imode } })
    ors.push({ fbclid: { contains: q, mode: imode } })
    ors.push({ ctwaclid: { contains: q, mode: imode } })
    ors.push({ whatsappConversation: { lead: { name: { contains: q, mode: imode } } } })
    ors.push({ whatsappConversation: { lead: { phone: { contains: q, mode: imode } } } })
    ors.push({ whatsappConversation: { lead: { mail: { contains: q, mode: imode } } } })
  }

  const filters: Prisma.TicketWhereInput[] = []
  if (ors.length) {
    filters.push({ OR: ors })
  }

  if (dateRangePreset) {
    const range = resolveDateRange(dateRangePreset)
    filters.push({ createdAt: { gte: range.gte, lte: range.lte } })
  }

  if (statusFilter) {
    // Usamos closedAt como proxy de status
    if (statusFilter === 'open') {
      filters.push({ closedAt: null })
    } else if (statusFilter === 'closed') {
      filters.push({ closedAt: { not: null } })
    }
  }

  const baseWhere: Prisma.TicketWhereInput = { organizationId }
  let where: Prisma.TicketWhereInput = baseWhere
  if (filters.length === 1) {
    where = { AND: [baseWhere, filters[0]] }
  } else if (filters.length > 1) {
    where = { AND: [baseWhere, ...filters] }
  }

  try {
    const cacheKey = JSON.stringify({ organizationId, q, page, pageSize, where })
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }

    console.time('[api/tickets] query')

    const [items, total, statuses] = await serialize(async () => {
      const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          closedAt: true,
          gclid: true,
          fbclid: true,
          ctwaclid: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          utmTerm: true,
          utmContent: true,
          createdAt: true,
          updatedAt: true,
          whatsappConversation: {
            select: {
              lead: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  mail: true,
                },
              },
            },
          },
        },
      })

      const [totalCount, statusGroups] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.groupBy({
          by: ['closedAt'],
          _count: { _all: true },
        }),
      ])

      const items = tickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.closedAt ? 'closed' : 'open',
        gclid: ticket.gclid,
        fbclid: ticket.fbclid,
        ctwaclid: ticket.ctwaclid,
        utmSource: ticket.utmSource,
        utmMedium: ticket.utmMedium,
        utmCampaign: ticket.utmCampaign,
        utmTerm: ticket.utmTerm,
        utmContent: ticket.utmContent,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        leadId: ticket.whatsappConversation?.lead?.id ?? null,
        leadName: ticket.whatsappConversation?.lead?.name ?? null,
        leadPhone: ticket.whatsappConversation?.lead?.phone ?? null,
        leadMail: ticket.whatsappConversation?.lead?.mail ?? null,
      }))

      const availableStatuses = statusGroups.map((group) => (group.closedAt ? 'closed' : 'open'))

      return [items, totalCount, availableStatuses] as const
    })

    console.timeEnd('[api/tickets] query')

    const payload = ticketsListResponseSchema.parse({
      items,
      total,
      page,
      pageSize,
      availableStatuses: statuses,
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
