import { describe, it, expect, vi, beforeEach } from 'vitest'
import { billingPlanDetectionService } from '../billing-plan-detection.service'

const prismaMock = vi.hoisted(() => ({
  billingPlan: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

describe('BillingPlanDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectRequiredPlan', () => {
    it('should return Starter plan for 1 project', async () => {
      const plans = [
        {
          id: 'plan_starter',
          code: 'test_starter',
          includedProjects: 1,
        },
        {
          id: 'plan_pro',
          code: 'test_pro',
          includedProjects: 3,
        },
        {
          id: 'plan_business',
          code: 'test_business',
          includedProjects: 5,
        },
      ]

      prismaMock.billingPlan.findMany.mockResolvedValueOnce(plans)

      const planId = await billingPlanDetectionService.detectRequiredPlan(1)
      expect(planId).toBe('plan_starter')
    })

    it('should return Pro plan for 2 projects', async () => {
      const plans = [
        {
          id: 'plan_starter',
          code: 'test_starter',
          includedProjects: 1,
        },
        {
          id: 'plan_pro',
          code: 'test_pro',
          includedProjects: 3,
        },
        {
          id: 'plan_business',
          code: 'test_business',
          includedProjects: 5,
        },
      ]

      prismaMock.billingPlan.findMany.mockResolvedValueOnce(plans)

      const planId = await billingPlanDetectionService.detectRequiredPlan(2)
      expect(planId).toBe('plan_pro')
    })

    it('should return Business plan for 5 projects', async () => {
      const plans = [
        {
          id: 'plan_starter',
          code: 'test_starter',
          includedProjects: 1,
        },
        {
          id: 'plan_pro',
          code: 'test_pro',
          includedProjects: 3,
        },
        {
          id: 'plan_business',
          code: 'test_business',
          includedProjects: 5,
        },
      ]

      prismaMock.billingPlan.findMany.mockResolvedValueOnce(plans)

      const planId = await billingPlanDetectionService.detectRequiredPlan(5)
      expect(planId).toBe('plan_business')
    })

    it('should return highest plan for projects exceeding all limits', async () => {
      const plans = [
        {
          id: 'plan_starter',
          code: 'test_starter',
          includedProjects: 1,
        },
        {
          id: 'plan_pro',
          code: 'test_pro',
          includedProjects: 3,
        },
        {
          id: 'plan_business',
          code: 'test_business',
          includedProjects: 5,
        },
      ]

      prismaMock.billingPlan.findMany.mockResolvedValueOnce(plans)

      const planId = await billingPlanDetectionService.detectRequiredPlan(100)
      expect(planId).toBe('plan_business')
    })
  })

  describe('findSmallestPlanThatFits', () => {
    it('should find smallest plan for 2 projects', async () => {
      const proPlan = {
        id: 'plan_pro',
        code: 'test_pro',
      }

      prismaMock.billingPlan.findFirst.mockResolvedValueOnce(proPlan)

      const plan = await billingPlanDetectionService.findSmallestPlanThatFits(2)
      expect(plan).toBeDefined()
      expect(plan?.code).toBe('test_pro')
    })

    it('should return null if no plan fits', async () => {
      prismaMock.billingPlan.findFirst.mockResolvedValueOnce(null)

      const plan = await billingPlanDetectionService.findSmallestPlanThatFits(2)
      expect(plan).toBeNull()
    })
  })

  describe('isUpgradeNeeded', () => {
    it('should return true when projects exceed plan limit', async () => {
      const starterPlan = {
        includedProjects: 1,
      }

      prismaMock.billingPlan.findUnique.mockResolvedValueOnce(starterPlan)

      const needed = await billingPlanDetectionService.isUpgradeNeeded('plan_starter', 2)
      expect(needed).toBe(true)
    })

    it('should return false when projects within limit', async () => {
      const proPlan = {
        includedProjects: 3,
      }

      prismaMock.billingPlan.findUnique.mockResolvedValueOnce(proPlan)

      const needed = await billingPlanDetectionService.isUpgradeNeeded('plan_pro', 2)
      expect(needed).toBe(false)
    })

    it('should return false when projects equal limit', async () => {
      const proPlan = {
        includedProjects: 3,
      }

      prismaMock.billingPlan.findUnique.mockResolvedValueOnce(proPlan)

      const needed = await billingPlanDetectionService.isUpgradeNeeded('plan_pro', 3)
      expect(needed).toBe(false)
    })
  })
})
