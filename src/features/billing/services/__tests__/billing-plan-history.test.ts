import { beforeEach, describe, expect, it, vi } from 'vitest'
import { billingPlanHistoryService } from '../billing-plan-history.service'

const prismaMock = vi.hoisted(() => ({
  billingPlanHistory: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

describe('BillingPlanHistoryService', () => {
  const testSubscriptionId = 'sub_123'
  const testPlanId = 'plan_456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordPlanChange', () => {
    it('should create a new plan history entry', async () => {
      const mockHistory = {
        id: 'history_123',
        subscriptionId: testSubscriptionId,
        planId: testPlanId,
        reason: 'trial_to_paid',
        projectCountAtChange: 1,
        startedAt: new Date(),
        endedAt: null,
        plan: { id: testPlanId, code: 'test_plan' },
        subscription: { id: testSubscriptionId },
      }

      prismaMock.billingPlanHistory.create.mockResolvedValueOnce(mockHistory)

      const result = await billingPlanHistoryService.recordPlanChange({
        subscriptionId: testSubscriptionId,
        planId: testPlanId,
        reason: 'trial_to_paid',
        projectCount: 1,
      })

      expect(result).toBeDefined()
      expect(result.subscriptionId).toBe(testSubscriptionId)
      expect(result.planId).toBe(testPlanId)
      expect(result.reason).toBe('trial_to_paid')
      expect(result.projectCountAtChange).toBe(1)
      expect(result.endedAt).toBeNull()
    })
  })

  describe('getCurrentPlan', () => {
    it('should return current plan when no endedAt', async () => {
      const mockPlan = {
        id: testPlanId,
        code: 'test_plan',
        name: 'Test Plan',
      }

      const mockHistory = {
        id: 'history_123',
        plan: mockPlan,
      }

      prismaMock.billingPlanHistory.findFirst.mockResolvedValueOnce(mockHistory)

      const currentPlan = await billingPlanHistoryService.getCurrentPlan(testSubscriptionId)

      expect(currentPlan).toBeDefined()
      expect(currentPlan?.id).toBe(testPlanId)
    })

    it('should return null if no current plan', async () => {
      prismaMock.billingPlanHistory.findFirst.mockResolvedValueOnce(null)

      const currentPlan = await billingPlanHistoryService.getCurrentPlan('non-existent')
      expect(currentPlan).toBeNull()
    })
  })

  describe('getHistory', () => {
    it('should return history in reverse chronological order', async () => {
      const mockHistory = [
        {
          id: 'history_2',
          subscriptionId: testSubscriptionId,
          planId: 'plan_pro',
          reason: 'auto_upgrade',
          projectCountAtChange: 2,
          startedAt: new Date('2026-04-16'),
          endedAt: null,
          plan: { id: 'plan_pro', code: 'test_pro' },
        },
        {
          id: 'history_1',
          subscriptionId: testSubscriptionId,
          planId: 'plan_starter',
          reason: 'trial_to_paid',
          projectCountAtChange: 1,
          startedAt: new Date('2026-04-01'),
          endedAt: new Date('2026-04-16'),
          plan: { id: 'plan_starter', code: 'test_starter' },
        },
      ]

      prismaMock.billingPlanHistory.findMany.mockResolvedValueOnce(mockHistory)

      const history = await billingPlanHistoryService.getHistory(testSubscriptionId)

      expect(history.length).toBe(2)
      expect(history[0].reason).toBe('auto_upgrade')
      expect(history[1].reason).toBe('trial_to_paid')
    })
  })

  describe('closePreviousPlan', () => {
    it('should set endedAt on current plan', async () => {
      const now = new Date()
      const previous = {
        id: 'history_123',
        subscriptionId: testSubscriptionId,
        planId: testPlanId,
        reason: 'trial_to_paid',
        projectCountAtChange: 1,
        startedAt: new Date(),
        endedAt: null,
      }

      const updated = {
        ...previous,
        endedAt: now,
      }

      prismaMock.billingPlanHistory.findFirst.mockResolvedValueOnce(previous)
      prismaMock.billingPlanHistory.update.mockResolvedValueOnce(updated)

      const closed = await billingPlanHistoryService.closePreviousPlan(testSubscriptionId)

      expect(closed?.endedAt).toBeDefined()
      expect(closed?.endedAt).not.toBeNull()
    })
  })
})
