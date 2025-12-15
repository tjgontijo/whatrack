import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * SubscriptionService Tests
 *
 * Tests for subscription database operations.
 */
describe('SubscriptionService', () => {
  const mockPrisma = {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getById', () => {
    it('should return subscription by id', async () => {
      const mockSubscription = {
        id: 'sub_1',
        billingCustomerId: 'cust_1',
        planId: 'plan_1',
        provider: 'asaas',
        status: 'active',
      }
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.getById('sub_1')

      expect(result).toEqual(mockSubscription)
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        include: { plan: true, billingCustomer: true, invoices: true },
      })
    })
  })

  describe('getByExternalId', () => {
    it('should return subscription by provider and external id', async () => {
      const mockSubscription = {
        id: 'sub_1',
        provider: 'asaas',
        externalId: 'ext_123',
        status: 'active',
      }
      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.getByExternalId('asaas', 'ext_123')

      expect(result).toEqual(mockSubscription)
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { provider: 'asaas', externalId: 'ext_123' },
        include: { plan: true, billingCustomer: true },
      })
    })
  })

  describe('getByBillingCustomerId', () => {
    it('should return active subscription for billing customer', async () => {
      const mockSubscription = {
        id: 'sub_1',
        billingCustomerId: 'cust_1',
        status: 'active',
      }
      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.getByBillingCustomerId('cust_1')

      expect(result).toEqual(mockSubscription)
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          billingCustomerId: 'cust_1',
          status: { in: ['active', 'trialing', 'past_due'] },
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('create', () => {
    it('should create a new subscription', async () => {
      const createData = {
        billingCustomerId: 'cust_1',
        planId: 'plan_1',
        provider: 'asaas' as const,
        externalId: 'ext_123',
        status: 'active' as const,
        interval: 'monthly' as const,
        currentPeriodStart: new Date('2025-01-01'),
        currentPeriodEnd: new Date('2025-02-01'),
      }

      const mockSubscription = { id: 'sub_1', ...createData }
      mockPrisma.subscription.create.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.create(createData)

      expect(result).toEqual(mockSubscription)
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: createData,
        include: { plan: true, billingCustomer: true },
      })
    })
  })

  describe('updateStatus', () => {
    it('should update subscription status', async () => {
      const mockSubscription = { id: 'sub_1', status: 'canceled' }
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.updateStatus('sub_1', 'canceled')

      expect(result.status).toBe('canceled')
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: { status: 'canceled' },
        include: { plan: true },
      })
    })
  })

  describe('renewPeriod', () => {
    it('should update subscription period dates', async () => {
      const start = new Date('2025-02-01')
      const end = new Date('2025-03-01')
      const mockSubscription = {
        id: 'sub_1',
        currentPeriodStart: start,
        currentPeriodEnd: end,
      }
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.renewPeriod('sub_1', start, end)

      expect(result.currentPeriodStart).toEqual(start)
      expect(result.currentPeriodEnd).toEqual(end)
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: { currentPeriodStart: start, currentPeriodEnd: end },
        include: { plan: true },
      })
    })
  })

  describe('cancel', () => {
    it('should cancel subscription immediately', async () => {
      const mockSubscription = {
        id: 'sub_1',
        status: 'canceled',
        canceledAt: expect.any(Date),
      }
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.cancel('sub_1', { immediate: true })

      expect(result.status).toBe('canceled')
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: {
          status: 'canceled',
          canceledAt: expect.any(Date),
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      })
    })

    it('should schedule cancellation at period end', async () => {
      const mockSubscription = {
        id: 'sub_1',
        status: 'active',
        cancelAtPeriodEnd: true,
      }
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.cancel('sub_1', { immediate: false })

      expect(result.cancelAtPeriodEnd).toBe(true)
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: { cancelAtPeriodEnd: true },
        include: { plan: true },
      })
    })
  })

  describe('listByOrganization', () => {
    it('should return all subscriptions for an organization via billing customer', async () => {
      const mockSubscriptions = [
        { id: 'sub_1', status: 'active' },
        { id: 'sub_2', status: 'canceled' },
      ]
      mockPrisma.subscription.findMany.mockResolvedValue(mockSubscriptions)

      const { SubscriptionService } = await import('../subscription-service')
      const service = new SubscriptionService(mockPrisma as never)

      const result = await service.listByOrganization('org_1')

      expect(result).toHaveLength(2)
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: { billingCustomer: { organizationId: 'org_1' } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
