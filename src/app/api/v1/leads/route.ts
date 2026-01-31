import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { validateFullAccess } from '@/server/auth/validate-organization-access'


// Lead schema - simplified without ticket/conversation dependencies
const leadSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  mail: z.string().nullable(),
  remoteJid: z.string().nullable(),
  createdAt: z.date(),
})

const leadsResponseSchema = z.object({
  items: z.array(leadSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

type LeadPayload = z.infer<typeof leadsResponseSchema>

// Simple in-memory cache
const cache = new Map<string, { ts: number; data: LeadPayload }>()
const CACHE_TTL_MS = 3000

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

const createLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  mail: z.string().email().optional().or(z.literal('')),
  remoteJid: z.string().optional(),
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
        remoteJid: validated.remoteJid,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[api/leads] POST error:', error)

    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = (error as { meta?: { target?: string[] } }).meta
      const field = meta?.target?.[1]

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

  const ors: Prisma.LeadWhereInput[] = []
  if (q) {
    const imode = 'insensitive' as Prisma.QueryMode
    ors.push({ name: { contains: q, mode: imode } })
    ors.push({ phone: { contains: q, mode: imode } })
    ors.push({ mail: { contains: q, mode: imode } })
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

  const baseWhere: Prisma.LeadWhereInput = { organizationId }
  let where: Prisma.LeadWhereInput = baseWhere
  if (filterConditions.length === 1) {
    where = { AND: [baseWhere, filterConditions[0]] }
  } else if (filterConditions.length > 1) {
    where = { AND: [baseWhere, ...filterConditions] }
  }

  try {
    const cacheKey = JSON.stringify({ organizationId, q, page, pageSize, where })
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }

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
          remoteJid: true,
          createdAt: true,
        },
      })

      const total = await prisma.lead.count({ where })

      return [leads, total] as const
    })

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
