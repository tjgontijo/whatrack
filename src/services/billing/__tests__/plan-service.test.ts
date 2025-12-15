import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * PlanService Tests
 *
 * Tests for plan lookup and pricing operations.
 */
describe('PlanService', () => {
  const mockPrisma = {
    plan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    planPrice: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listActivePlans', () => {
    it('should return all active plans sorted by sortOrder', async () => {
      const mockPlans = [
        { id: 'plan_1', name: 'Free', slug: 'free', isActive: true, sortOrder: 0 },
        { id: 'plan_2', name: 'Starter', slug: 'starter', isActive: true, sortOrder: 1 },
        { id: 'plan_3', name: 'Pro', slug: 'pro', isActive: true, sortOrder: 2 },
      ]
      mockPrisma.plan.findMany.mockResolvedValue(mockPlans)

      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = await service.listActivePlans()

      expect(result).toHaveLength(3)
      expect(mockPrisma.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { prices: true },
      })
    })
  })

  describe('getPlanById', () => {
    it('should return plan by id', async () => {
      const mockPlan = {
        id: 'plan_1',
        name: 'Starter',
        slug: 'starter',
        isActive: true,
        prices: [],
      }
      mockPrisma.plan.findUnique.mockResolvedValue(mockPlan)

      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = await service.getPlanById('plan_1')

      expect(result).toEqual(mockPlan)
      expect(mockPrisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan_1' },
        include: { prices: true },
      })
    })

    it('should return null when plan not found', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue(null)

      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = await service.getPlanById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getPlanBySlug', () => {
    it('should return plan by slug', async () => {
      const mockPlan = {
        id: 'plan_1',
        name: 'Starter',
        slug: 'starter',
        isActive: true,
      }
      mockPrisma.plan.findFirst.mockResolvedValue(mockPlan)

      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = await service.getPlanBySlug('starter')

      expect(result).toEqual(mockPlan)
      expect(mockPrisma.plan.findFirst).toHaveBeenCalledWith({
        where: { slug: 'starter', isActive: true },
        include: { prices: true },
      })
    })
  })

  describe('getPlanPrice', () => {
    it('should return price for plan/provider/currency/interval combination', async () => {
      const mockPrice = {
        id: 'price_1',
        planId: 'plan_1',
        provider: 'asaas',
        currency: 'BRL',
        interval: 'monthly',
        amountCents: 9700,
        isActive: true,
      }
      mockPrisma.planPrice.findFirst.mockResolvedValue(mockPrice)

      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = await service.getPlanPrice({
        planId: 'plan_1',
        provider: 'asaas',
        currency: 'BRL',
        interval: 'monthly',
      })

      expect(result).toEqual(mockPrice)
      expect(mockPrisma.planPrice.findFirst).toHaveBeenCalledWith({
        where: {
          planId: 'plan_1',
          provider: 'asaas',
          currency: 'BRL',
          interval: 'monthly',
          isActive: true,
        },
        include: { plan: true },
      })
    })

    it('should return null when price not found', async () => {
      mockPrisma.planPrice.findFirst.mockResolvedValue(null)

      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = await service.getPlanPrice({
        planId: 'plan_1',
        provider: 'stripe',
        currency: 'USD',
        interval: 'yearly',
      })

      expect(result).toBeNull()
    })
  })

  describe('getDefaultProviderForCurrency', () => {
    it('should return asaas for BRL currency', async () => {
      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = service.getDefaultProviderForCurrency('BRL')

      expect(result).toBe('asaas')
    })

    it('should return stripe for USD currency', async () => {
      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = service.getDefaultProviderForCurrency('USD')

      expect(result).toBe('stripe')
    })

    it('should return stripe for unknown currency', async () => {
      const { PlanService } = await import('../plan-service')
      const service = new PlanService(mockPrisma as never)

      const result = service.getDefaultProviderForCurrency('EUR')

      expect(result).toBe('stripe')
    })
  })
})
