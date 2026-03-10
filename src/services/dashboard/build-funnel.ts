import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@db/client'
import type { DateRange } from '@/lib/date/date-range'

export type FunnelSummary = {
  leads: number
  schedules: number
  attendances: number
}

export async function buildFunnel(
  organizationId: string,
  dateRange?: DateRange,
  projectId?: string | null
): Promise<FunnelSummary> {
  const [leads, schedules, attendances] = await Promise.all([
    buildLeadsCount(organizationId, dateRange, projectId),
    buildAppointmentsCount(organizationId, dateRange),
    buildAttendancesCount(organizationId, dateRange),
  ])

  return { leads, schedules, attendances }
}

async function buildLeadsCount(
  organizationId: string,
  dateRange?: DateRange,
  projectId?: string | null,
) {
  const where: Prisma.LeadWhereInput = {
    organizationId,
    ...(projectId ? { projectId } : {}),
  }

  if (dateRange) {
    where.createdAt = { gte: dateRange.gte, lte: dateRange.lte }
  }

  return prisma.lead.count({ where })
}

async function buildAppointmentsCount(_organizationId: string, _dateRange?: DateRange) {
  // Appointment model was removed - schedules are no longer tracked
  return 0
}

async function buildAttendancesCount(_organizationId: string, _dateRange?: DateRange) {
  // Attendance model was removed - attendances are no longer tracked
  return 0
}
