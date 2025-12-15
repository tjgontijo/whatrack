import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { DateRange } from '@/lib/date/dateRange'

export type FunnelSummary = {
  leads: number
  schedules: number
  attendances: number
}

export async function buildFunnel(organizationId: string, dateRange?: DateRange): Promise<FunnelSummary> {
  const [leads, schedules, attendances] = await Promise.all([
    buildLeadsCount(organizationId, dateRange),
    buildAppointmentsCount(organizationId, dateRange),
    buildAttendancesCount(organizationId, dateRange),
  ])

  return { leads, schedules, attendances }
}

async function buildLeadsCount(organizationId: string, dateRange?: DateRange) {
  const ticketWhere: Prisma.TicketWhereInput = { organizationId }

  if (dateRange) {
    ticketWhere.createdAt = { gte: dateRange.gte, lte: dateRange.lte }
  }

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    select: { leadId: true },
  })

  const leadIds = new Set<string>()

  for (const ticket of tickets) {
    if (ticket.leadId) {
      leadIds.add(ticket.leadId)
    }
  }

  return leadIds.size
}

async function buildAppointmentsCount(organizationId: string, dateRange?: DateRange) {
  if (!dateRange) {
    return prisma.appointment.count({ where: { organizationId } })
  }

  return prisma.appointment.count({
    where: {
      organizationId,
      scheduledFor: {
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    },
  })
}

async function buildAttendancesCount(organizationId: string, dateRange?: DateRange) {
  if (!dateRange) {
    return prisma.attendance.count({ where: { organizationId } })
  }

  return prisma.attendance.count({
    where: {
      organizationId,
      createdAt: {
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    },
  })
}
