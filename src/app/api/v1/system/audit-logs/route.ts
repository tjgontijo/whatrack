import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

const PERIOD_PRESETS = [
  'today',
  'yesterday',
  '3d',
  '7d',
  '15d',
  '30d',
  'thisMonth',
  'lastMonth',
  'custom',
] as const

type PeriodPreset = (typeof PERIOD_PRESETS)[number]

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  periodPreset: z.enum(PERIOD_PRESETS).default('7d'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  resourceType: z.string().optional(),
  organizationId: z.string().optional(),
})

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function parseDateInput(dateString: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

function resolveDateRange(
  periodPreset: PeriodPreset,
  startDateInput?: string,
  endDateInput?: string
): { range: { gte: Date; lte: Date } } | { error: string } {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  if (periodPreset === 'today') {
    return { range: { gte: todayStart, lte: todayEnd } }
  }

  if (periodPreset === 'yesterday') {
    const start = new Date(todayStart)
    const end = new Date(todayEnd)
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    return { range: { gte: start, lte: end } }
  }

  if (periodPreset.endsWith('d')) {
    const days = Number.parseInt(periodPreset.replace('d', ''), 10)
    const from = new Date(todayStart)
    from.setDate(from.getDate() - (days - 1))
    return { range: { gte: from, lte: todayEnd } }
  }

  if (periodPreset === 'thisMonth') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { range: { gte: monthStart, lte: todayEnd } }
  }

  if (periodPreset === 'lastMonth') {
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
    prevMonthEnd.setMilliseconds(prevMonthEnd.getMilliseconds() - 1)
    return { range: { gte: prevMonthStart, lte: prevMonthEnd } }
  }

  if (!startDateInput || !endDateInput) {
    return { error: 'startDate e endDate são obrigatórios para período customizado' }
  }

  const parsedStart = parseDateInput(startDateInput)
  const parsedEnd = parseDateInput(endDateInput)

  if (!parsedStart || !parsedEnd) {
    return { error: 'startDate/endDate inválidos. Use o formato YYYY-MM-DD.' }
  }

  if (parsedStart.getTime() > parsedEnd.getTime()) {
    return { error: 'startDate não pode ser maior que endDate' }
  }

  return {
    range: {
      gte: startOfDay(parsedStart),
      lte: endOfDay(parsedEnd),
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'system:read_logs')
    if (user instanceof NextResponse) return user

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      page,
      pageSize,
      periodPreset,
      startDate: rawStartDate,
      endDate: rawEndDate,
      resourceType: rawResourceType,
      organizationId: rawOrganizationId,
    } = parsed.data

    const startDate = rawStartDate?.trim() || undefined
    const endDate = rawEndDate?.trim() || undefined
    const resourceType = rawResourceType?.trim() || undefined
    const organizationId = rawOrganizationId?.trim() || undefined

    const rangeResult = resolveDateRange(periodPreset, startDate, endDate)
    if ('error' in rangeResult) {
      return NextResponse.json({ error: rangeResult.error }, { status: 400 })
    }

    const where: Prisma.OrgAuditLogWhereInput = {
      createdAt: {
        gte: rangeResult.range.gte,
        lte: rangeResult.range.lte,
      },
      ...(resourceType ? { resourceType } : {}),
      ...(organizationId ? { organizationId } : {}),
    }

    const skip = (page - 1) * pageSize

    const [logs, total] = await Promise.all([
      prisma.orgAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.orgAuditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[system/audit-logs] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
