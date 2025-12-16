import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


// Tipar a resposta usando Zod para garantir consistência e evitar `any`
const leadSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  mail: z.string().nullable(),
  instagram: z.string().nullable(),
  remoteJid: z.string().nullable(),
  createdAt: z.date(),
  hasTickets: z.boolean(),
  hasSales: z.boolean(),
  hasAudit: z.boolean(),
  hasMessages: z.boolean(),
})

const leadsResponseSchema = z.object({
  items: z.array(leadSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

type LeadPayload = z.infer<typeof leadsResponseSchema>

// Simple in-memory cache to reduce repeated hits from the client in dev
const cache = new Map<string, { ts: number; data: LeadPayload }>()
const CACHE_TTL_MS = 3000 // 3s is enough to cut duplicate refetches in dev

// Prevent concurrent requests from exhausting the connection pool
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

  // lastMonth
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
  prevMonthEnd.setMilliseconds(prevMonthEnd.getMilliseconds() - 1)

  return { gte: prevMonthStart, lte: prevMonthEnd }
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

const createLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  mail: z.string().email().optional().or(z.literal('')),
  instagram: z.string().optional(),
  remoteJid: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional().default('new'),
})

export async function POST(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }
  const organizationId = access.organizationId

  try {
    const body = await req.json()
    const validated = createLeadSchema.parse(body)

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name: validated.name,
        phone: validated.phone,
        mail: validated.mail || null,
        instagram: validated.instagram,
        remoteJid: validated.remoteJid,
        assignedTo: validated.assignedTo,
        notes: validated.notes,
        status: validated.status || 'new',
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[api/leads] POST error:', error)

    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = (error as { meta?: { target?: string[] } }).meta
      const field = meta?.target?.[1] // e.g., 'phone' or 'remoteJid'

      if (field === 'phone') {
        return NextResponse.json(
          { error: 'Já existe um lead com este número de telefone nesta organização' },
          { status: 409 }
        )
      }
      if (field === 'remoteJid' || field === 'remote_jid') {
        return NextResponse.json(
          { error: 'Já existe um lead com este ID do WhatsApp nesta organização' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Já existe um lead com estas informações' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao criar lead', details: String(error) },
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
    Math.min(100, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20)
  )

  const dateRangeValue = searchParams.get('dateRange')
  const dateRangePreset = isDateRangePreset(dateRangeValue) ? (dateRangeValue as DateRangePreset) : undefined
  const hasTicketsFilter = parseBooleanParam(searchParams.get('hasTickets'))
  const hasSalesFilter = parseBooleanParam(searchParams.get('hasSales'))
  const hasMessagesFilter = parseBooleanParam(
    searchParams.get('hasMessages') ?? searchParams.get('hasMessage')
  )
  const hasAuditFilter = parseBooleanParam(searchParams.get('hasAudit'))

  const ors: Prisma.LeadWhereInput[] = []
  if (q) {
    const imode = 'insensitive' as Prisma.QueryMode
    ors.push({ name: { contains: q, mode: imode } })
    ors.push({ phone: { contains: q, mode: imode } })
    ors.push({ mail: { contains: q, mode: imode } })
    ors.push({ instagram: { contains: q, mode: imode } })
    ors.push({ remoteJid: { contains: q, mode: imode } })
    const looksLikeUuid = /^[0-9a-fA-F-]{32,36}$/.test(q)
    if (looksLikeUuid) ors.push({ id: q })
  }

  const filterConditions: Prisma.LeadWhereInput[] = []
  if (ors.length) {
    filterConditions.push({ OR: ors })
  }

  if (dateRangePreset) {
    const range = resolveDateRange(dateRangePreset)
    filterConditions.push({ createdAt: { gte: range.gte, lte: range.lte } })
  }

  if (hasTicketsFilter !== undefined) {
    filterConditions.push(
      hasTicketsFilter ? { tickets: { some: {} } } : { tickets: { none: {} } }
    )
  }

  if (hasSalesFilter !== undefined) {
    filterConditions.push(
      hasSalesFilter
        ? { tickets: { some: { sales: { some: {} } } } }
        : { tickets: { none: { sales: { some: {} } } } }
    )
  }

  if (hasMessagesFilter !== undefined) {
    filterConditions.push(
      hasMessagesFilter
        ? { whatsappMessages: { some: {} } }
        : { whatsappMessages: { none: {} } }
    )
  }

  if (hasAuditFilter !== undefined) {
    filterConditions.push(
      hasAuditFilter
        ? { salesAnalytics: { some: {} } }
        : { salesAnalytics: { none: {} } }
    )
  }

  const baseWhere: Prisma.LeadWhereInput = { organizationId }
  let where: Prisma.LeadWhereInput = baseWhere
  if (filterConditions.length === 1) {
    where = { AND: [baseWhere, filterConditions[0]] }
  } else if (filterConditions.length > 1) {
    where = { AND: [baseWhere, ...filterConditions] }
  }

  try {
    console.log('[api/leads] params', {
      q,
      page,
      pageSize,
      dateRange: dateRangePreset,
      hasTickets: hasTicketsFilter,
      hasSales: hasSalesFilter,
      hasMessages: hasMessagesFilter,
      hasAudit: hasAuditFilter,
    })
    console.log('[api/leads] where', JSON.stringify(where))

    const cacheKey = JSON.stringify({ organizationId, q, page, pageSize, where })
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log('[api/leads] cache hit')
      return NextResponse.json(cached.data)
    }

    console.time('[api/leads] query')

    // ⚠️ Evita uso de $transaction (abre múltiplas conexões)
    const [items, total] = await serialize(async () => {
      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          mail: true,
          instagram: true,
          remoteJid: true,
          createdAt: true,
          _count: {
            select: {
              tickets: true,
              salesAnalytics: true,
              whatsappMessages: true,
            },
          },
          tickets: {
            select: {
              id: true,
              _count: {
                select: {
                  sales: true,
                },
              },
            },
          },
        },
      })

      const total = await prisma.lead.count({ where })

      const items = leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        mail: lead.mail,
        instagram: lead.instagram,
        remoteJid: lead.remoteJid,
        createdAt: lead.createdAt,
        hasTickets: lead._count.tickets > 0,
        hasSales: lead.tickets.some((ticket) => ticket._count.sales > 0),
        hasAudit: lead._count.salesAnalytics > 0,
        hasMessages: lead._count.whatsappMessages > 0,
      }))

      return [items, total] as const
    })

    console.timeEnd('[api/leads] query')
    console.log('[api/leads] result', { total, itemsLen: items.length })

    const payload = leadsResponseSchema.parse({ items, total, page, pageSize })
    cache.set(cacheKey, { ts: Date.now(), data: payload })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/leads] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: String(error) },
      { status: 500 }
    )
  }
}
