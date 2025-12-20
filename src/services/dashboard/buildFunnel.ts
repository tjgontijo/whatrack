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
  const where: any = { organizationId }

  if (dateRange) {
    where.createdAt = { gte: dateRange.gte, lte: dateRange.lte }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      whatsappConversation: {
        select: { leadId: true },
      },
    },
  })

  const leadIds = new Set<string>()

  for (const ticket of tickets) {
    if (ticket.whatsappConversation?.leadId) {
      leadIds.add(ticket.whatsappConversation.leadId)
    }
  }

  return leadIds.size
}

async function buildAppointmentsCount(_organizationId: string, _dateRange?: DateRange) {
  // Appointment model was removed - schedules are no longer tracked
  return 0
}

async function buildAttendancesCount(_organizationId: string, _dateRange?: DateRange) {
  // Attendance model was removed - attendances are no longer tracked
  return 0
}
