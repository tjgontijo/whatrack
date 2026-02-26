import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import type { AuditLogPeriodPreset, SystemAuditLogsQueryInput } from '@/schemas/system/system-schemas'

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
  periodPreset: AuditLogPeriodPreset,
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

export async function listSystemAuditLogs(query: SystemAuditLogsQueryInput) {
  const startDate = query.startDate?.trim() || undefined
  const endDate = query.endDate?.trim() || undefined
  const resourceType = query.resourceType?.trim() || undefined
  const organizationId = query.organizationId?.trim() || undefined

  const rangeResult = resolveDateRange(query.periodPreset, startDate, endDate)
  if ('error' in rangeResult) {
    return { error: rangeResult.error, status: 400 as const }
  }

  const where: Prisma.OrgAuditLogWhereInput = {
    createdAt: {
      gte: rangeResult.range.gte,
      lte: rangeResult.range.lte,
    },
    ...(resourceType ? { resourceType } : {}),
    ...(organizationId ? { organizationId } : {}),
  }

  const skip = (query.page - 1) * query.pageSize

  const [logs, total] = await Promise.all([
    prisma.orgAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.pageSize,
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

  return {
    data: {
      data: logs,
      total,
      page: query.page,
      pageSize: query.pageSize,
    },
  }
}

export async function listSystemAuditLogFilters() {
  const [resourceRows, organizations] = await Promise.all([
    prisma.orgAuditLog.findMany({
      distinct: ['resourceType'],
      select: { resourceType: true },
      orderBy: { resourceType: 'asc' },
    }),
    prisma.organization.findMany({
      where: {
        orgAuditLogs: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  return {
    resourceTypes: resourceRows
      .map((item) => item.resourceType)
      .filter((resourceType): resourceType is string => Boolean(resourceType)),
    organizations,
  }
}
