import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { salesListResponseSchema } from '@/schemas/lead-tickets'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


const createSaleSchema = z.object({
  ticketId: z.string().optional(),
  totalAmount: z.number().optional(),
  profit: z.number().optional(),
  discount: z.number().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().optional(),
    name: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number(),
  })).optional(),
})

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

export async function POST(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId
  const userId = access.userId

  try {
    const body = await req.json()
    const validated = createSaleSchema.parse(body)

    // Calculate total from items if provided
    let calculatedTotal = validated.totalAmount || 0
    if (validated.items && validated.items.length > 0) {
      calculatedTotal = validated.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      if (validated.discount) {
        calculatedTotal -= validated.discount
      }
    }

    const sale = await prisma.sale.create({
      data: {
        organizationId,
        ticketId: validated.ticketId,
        totalAmount: calculatedTotal,
        profit: validated.profit,
        discount: validated.discount,
        status: validated.status || 'pending',
        notes: validated.notes,
        createdBy: userId,
        items: validated.items ? {
          create: validated.items.map(item => ({
            organizationId,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          }))
        } : undefined,
      },
      include: {
        items: true,
      },
    })

    // Revalidar cache do dashboard após criar venda
    revalidateTag('dashboard-summary', 'max')
    revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('[api/sales] POST error:', error)
    return NextResponse.json(
      { error: 'Falha ao criar venda', details: String(error) },
      { status: 500 }
    )
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

  const ors: Prisma.SaleWhereInput[] = []

  if (q) {
    const imode = 'insensitive' as Prisma.QueryMode
    // Campos existentes em Sale / Ticket
    ors.push({ notes: { contains: q, mode: imode } })
    ors.push({ ticket: { utmSource: { contains: q, mode: imode } } })
    ors.push({ ticket: { utmMedium: { contains: q, mode: imode } } })
    ors.push({ ticket: { utmCampaign: { contains: q, mode: imode } } })
    ors.push({ ticket: { utmTerm: { contains: q, mode: imode } } })
    ors.push({ ticket: { utmContent: { contains: q, mode: imode } } })
    ors.push({ ticket: { gclid: { contains: q, mode: imode } } })
    ors.push({ ticket: { fbclid: { contains: q, mode: imode } } })
    ors.push({ ticket: { ctwaclid: { contains: q, mode: imode } } })
    ors.push({ ticket: { whatsappConversation: { lead: { name: { contains: q, mode: imode } } } } })
    ors.push({ ticket: { whatsappConversation: { lead: { phone: { contains: q, mode: imode } } } } })
    ors.push({ ticket: { whatsappConversation: { lead: { mail: { contains: q, mode: imode } } } } })
  }

  const filters: Prisma.SaleWhereInput[] = []
  if (ors.length) {
    filters.push({ OR: ors })
  }

  if (dateRangePreset) {
    const range = resolveDateRange(dateRangePreset)
    filters.push({ createdAt: { gte: range.gte, lte: range.lte } })
  }

  if (statusFilter) {
    const statusCondition = { status: statusFilter } as unknown as Prisma.SaleWhereInput
    filters.push(statusCondition)
  }

  const baseWhere: Prisma.SaleWhereInput = { organizationId }
  let where: Prisma.SaleWhereInput = baseWhere
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

    console.time('[api/sales] query')

    const [items, total, statuses] = await serialize(async () => {
      const sales = await prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          ticket: {
            select: {
              id: true,
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
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
          },
        },
      })

      const [totalCount, statusGroups] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
      ])

      const items = sales.map((sale) => ({
        id: sale.id,
        amount: sale.totalAmount ? Number(sale.totalAmount) : null,
        serviceCount: null,
        fbtraceId: null,
        createdAt: sale.createdAt.toISOString(),
        updatedAt: sale.updatedAt.toISOString(),
        ticketId: sale.ticket?.id ?? null,
        ticketStatus: sale.status ?? null,
        ticketPipefyId: null,
        ticketPipefyUrl: null,
        ticketUtmSource: sale.ticket?.utmSource ?? null,
        ticketUtmMedium: sale.ticket?.utmMedium ?? null,
        ticketUtmCampaign: sale.ticket?.utmCampaign ?? null,
        leadId: sale.ticket?.whatsappConversation?.lead?.id ?? null,
        leadName: sale.ticket?.whatsappConversation?.lead?.name ?? null,
        leadPhone: sale.ticket?.whatsappConversation?.lead?.phone ?? null,
        leadMail: sale.ticket?.whatsappConversation?.lead?.mail ?? null,
      }))

      const availableStatuses = statusGroups.map((group) => group.status ?? null)

      return [items, totalCount, availableStatuses] as const
    })

    console.timeEnd('[api/sales] query')

    const payload = salesListResponseSchema.parse({
      items,
      total,
      page,
      pageSize,
      availableStatuses: statuses,
    })
    cache.set(cacheKey, { ts: Date.now(), data: payload })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/sales] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: String(error) },
      { status: 500 },
    )
  }
}
