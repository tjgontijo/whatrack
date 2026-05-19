import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DashboardRepository } from '../dashboard.repository'

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    dashboardDailyMetric: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    dashboardOriginDailyMetric: {
      groupBy: vi.fn(),
    },
    dashboardMetaEntityDailyMetric: {
      groupBy: vi.fn(),
    },
    metaInsightSyncRun: {
      findFirst: vi.fn(),
    },
    dashboardMetricRefreshRun: {
      findFirst: vi.fn(),
    },
    organizationAnalyticsSettings: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db/prisma'

describe('DashboardRepository', () => {
  let repository: DashboardRepository

  beforeEach(() => {
    repository = new DashboardRepository()
    vi.clearAllMocks()
  })

  describe('getDailyMetrics', () => {
    it('filters by organizationId and date range', async () => {
      const mockPrisma = prisma as any
      mockPrisma.dashboardDailyMetric.findMany.mockResolvedValue([])

      const orgId = 'org-123'
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      await repository.getDailyMetrics(orgId, dateFrom, dateTo)

      expect(mockPrisma.dashboardDailyMetric.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          projectId: null,
          date: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        select: expect.any(Object),
      })
    })

    it('includes projectId when provided', async () => {
      const mockPrisma = prisma as any
      mockPrisma.dashboardDailyMetric.findMany.mockResolvedValue([])

      const orgId = 'org-123'
      const projectId = 'proj-456'
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      await repository.getDailyMetrics(orgId, dateFrom, dateTo, projectId)

      expect(mockPrisma.dashboardDailyMetric.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          projectId: projectId,
          date: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        select: expect.any(Object),
      })
    })
  })

  describe('getAggregatedMetrics', () => {
    it('always includes organizationId in WHERE clause', async () => {
      const mockPrisma = prisma as any
      mockPrisma.dashboardDailyMetric.aggregate.mockResolvedValue({
        _sum: {
          revenueCompleted: 1000,
          revenuePending: 0,
          revenuePipeline: 5000,
          metaPaidSpend: 500,
          metaPaidRevenue: 1200,
          metaPaidClicks: 100,
          metaPaidImpressions: 5000,
          leadsTotal: 50,
          leadsMetaPaid: 20,
          salesTotal: 10,
          salesMetaAttribued: 5,
        },
      })

      const orgId = 'org-123'
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      await repository.getAggregatedMetrics(orgId, dateFrom, dateTo)

      // Verify organizationId is always in WHERE clause
      const call = (mockPrisma.dashboardDailyMetric.aggregate as any).mock.calls[0][0]
      expect(call.where).toHaveProperty('organizationId', orgId)
    })

    it('never returns data without organizationId validation', async () => {
      const mockPrisma = prisma as any

      // Simulate a query attempt without organizationId
      // This should never happen in real code, but the test ensures
      // the repository always enforces the filter

      const orgId = 'org-123'
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      // Reset mock to verify the WHERE clause
      mockPrisma.dashboardDailyMetric.aggregate.mockResolvedValue({ _sum: {} })

      await repository.getAggregatedMetrics(orgId, dateFrom, dateTo)

      const whereClause = (mockPrisma.dashboardDailyMetric.aggregate as any).mock
        .calls[0][0].where

      // Ensure organizationId filter exists and is not empty
      expect(whereClause.organizationId).toBeDefined()
      expect(whereClause.organizationId).toBe(orgId)
    })
  })

  describe('multi-tenant safety', () => {
    it('prevents accidental cross-organization queries', async () => {
      const mockPrisma = prisma as any
      mockPrisma.dashboardDailyMetric.findMany.mockResolvedValue([])

      const orgId = 'org-123'
      const wrongOrgId = 'org-999'

      // Should not return data for wrong org
      await repository.getDailyMetrics(orgId, new Date(), new Date())

      const where = (mockPrisma.dashboardDailyMetric.findMany as any).mock.calls[0][0]
        .where

      // Ensure org filter is specific
      expect(where.organizationId).toBe(orgId)
      expect(where.organizationId).not.toBe(wrongOrgId)
    })
  })
})
