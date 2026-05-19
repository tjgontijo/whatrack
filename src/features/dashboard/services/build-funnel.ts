import "server-only"
import type { Prisma } from '@generated/prisma/client'
import type { DateRange } from '@/lib/date/date-range'
import { prisma } from '@/lib/db/prisma'

export type FunnelStep = {
  label: string
  value: number
  currentValue: number
  color?: string
  dealValueSum: number
  currentDealValueSum: number
}

export type FunnelSummary = {
  steps: FunnelStep[]
  leads: number
  schedules: number
  attendances: number
}

export async function buildFunnel(
  organizationId: string,
  dateRange?: DateRange,
  projectId?: string | null
): Promise<FunnelSummary> {
  const [leads, stages] = await Promise.all([
    buildLeadsCount(organizationId, dateRange, projectId),
    prisma.dealStage.findMany({
      where: {
        organizationId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { order: 'asc' },
    }),
  ])

  // Cumulative and current stage counts and sums
  const stageCounts = await Promise.all(
    stages.map(async (stage) => {
      // Cumulative: Deals that are in this stage or any subsequent stage
      const cumulativeAggr = await prisma.deal.aggregate({
        where: {
          organizationId,
          ...(projectId ? { projectId } : {}),
          ...(dateRange ? { stageEnteredAt: { gte: dateRange.gte, lte: dateRange.lte } } : {}),
          stage: {
            order: { gte: stage.order },
          },
        },
        _count: { _all: true },
        _sum: { dealValue: true },
      })

      // Current: Deals strictly in this stage
      const currentAggr = await prisma.deal.aggregate({
        where: {
          organizationId,
          stageId: stage.id,
          ...(projectId ? { projectId } : {}),
          ...(dateRange ? { stageEnteredAt: { gte: dateRange.gte, lte: dateRange.lte } } : {}),
        },
        _count: { _all: true },
        _sum: { dealValue: true },
      })

      return {
        label: stage.name,
        value: cumulativeAggr._count._all,
        currentValue: currentAggr._count._all,
        dealValueSum: cumulativeAggr._sum.dealValue ? Number(cumulativeAggr._sum.dealValue) : 0,
        currentDealValueSum: currentAggr._sum.dealValue ? Number(currentAggr._sum.dealValue) : 0,
        color: stage.color,
      }
    })
  )

  return {
    steps: stageCounts,
    leads,
    schedules: 0,
    attendances: 0,
  }
}

async function buildLeadsCount(
  organizationId: string,
  dateRange?: DateRange,
  projectId?: string | null
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
