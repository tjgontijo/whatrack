import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * BillingService Tests
 *
 * Tests for the main billing orchestration service.
 */
describe('BillingService', () => {
  const mockProvider = {
    provider: 'asaas',
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    createSubscription: vi.fn(),
    getSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    tokenizeCard: vi.fn(),
    getPayment: vi.fn(),
    validateWebhookSignature: vi.fn(),
  }

  const mockPlanService = {
    getPlanById: vi.fn(),
    getPlanPrice: vi.fn(),
    getDefaultProviderForCurrency: vi.fn(),
  }

  const mockCustomerService = {
    getById: vi.fn(),
    getByOrganizationId: vi.fn(),
    create: vi.fn(),
    addExternalId: vi.fn(),
    getExternalIdForProvider: vi.fn(),
  }

  const mockSubscriptionService = {
    getById: vi.fn(),
    create: vi.fn(),
    getByBillingCustomerId: vi.fn(),
    updateStatus: vi.fn(),
    cancel: vi.fn(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getOrCreateCustomer', () => {
    it('should return existing billing customer if exists', async () => {
      const existingCustomer = {
        id: 'cust_1',
        organizationId: 'org_1',
        email: 'test@example.com',
        externalCustomers: [{ provider: 'asaas', externalId: 'cus_asaas_123' }],
      }
      mockCustomerService.getByOrganizationId.mockResolvedValue(existingCustomer)

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
      })

      const result = await service.getOrCreateCustomer('org_1')

      expect(result).toEqual(existingCustomer)
      expect(mockProvider.createCustomer).not.toHaveBeenCalled()
    })

    it('should create new customer in provider and database if not exists', async () => {
      const orgData = {
        id: 'org_1',
        name: 'Test Org',
        owner: { email: 'owner@example.com' },
      }
      const createdCustomer = {
        id: 'cust_new',
        organizationId: 'org_1',
        email: 'owner@example.com',
        externalCustomers: [{ provider: 'asaas', externalId: 'cus_asaas_new' }],
      }

      mockCustomerService.getByOrganizationId.mockResolvedValue(null)
      mockProvider.createCustomer.mockResolvedValue({
        externalId: 'cus_asaas_new',
        metadata: { name: 'Test Org' },
      })
      mockCustomerService.create.mockResolvedValue({
        id: 'cust_new',
        organizationId: 'org_1',
        email: 'owner@example.com',
        externalCustomers: [],
      })
      mockCustomerService.addExternalId.mockResolvedValue({
        provider: 'asaas',
        externalId: 'cus_asaas_new',
      })
      mockCustomerService.getById.mockResolvedValue(createdCustomer)

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
        getOrganization: vi.fn().mockResolvedValue(orgData),
      })

      const result = await service.getOrCreateCustomer('org_1')

      expect(result.id).toBe('cust_new')
      expect(mockProvider.createCustomer).toHaveBeenCalled()
      expect(mockCustomerService.create).toHaveBeenCalled()
      expect(mockCustomerService.addExternalId).toHaveBeenCalledWith(
        'cust_new',
        'asaas',
        'cus_asaas_new'
      )
    })
  })

  describe('createSubscription', () => {
    it('should create subscription in provider and database', async () => {
      const billingCustomer = {
        id: 'cust_1',
        organizationId: 'org_1',
        externalCustomers: [{ provider: 'asaas', externalId: 'cus_asaas_123' }],
      }
      const plan = {
        id: 'plan_1',
        name: 'Starter',
        slug: 'starter',
      }
      const planPrice = {
        id: 'price_1',
        planId: 'plan_1',
        provider: 'asaas',
        currency: 'BRL',
        interval: 'monthly',
        amountCents: 9700,
      }

      mockCustomerService.getByOrganizationId.mockResolvedValue(billingCustomer)
      mockCustomerService.getExternalIdForProvider.mockResolvedValue('cus_asaas_123')
      mockPlanService.getPlanById.mockResolvedValue(plan)
      mockPlanService.getPlanPrice.mockResolvedValue(planPrice)
      mockProvider.createSubscription.mockResolvedValue({
        externalId: 'sub_asaas_123',
        status: 'active',
        currentPeriodStart: new Date('2025-01-01'),
        currentPeriodEnd: new Date('2025-02-01'),
      })
      mockSubscriptionService.create.mockResolvedValue({
        id: 'sub_1',
        billingCustomerId: 'cust_1',
        planId: 'plan_1',
        provider: 'asaas',
        externalId: 'sub_asaas_123',
        status: 'active',
      })

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
      })

      const result = await service.createSubscription({
        organizationId: 'org_1',
        planId: 'plan_1',
        interval: 'monthly',
        billingType: 'credit_card',
        cardToken: 'card_token_123',
      })

      expect(result.externalId).toBe('sub_asaas_123')
      expect(mockProvider.createSubscription).toHaveBeenCalled()
      expect(mockSubscriptionService.create).toHaveBeenCalled()
    })

    it('should throw error if plan not found', async () => {
      mockCustomerService.getByOrganizationId.mockResolvedValue({ id: 'cust_1' })
      mockPlanService.getPlanById.mockResolvedValue(null)

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
      })

      await expect(
        service.createSubscription({
          organizationId: 'org_1',
          planId: 'nonexistent',
          interval: 'monthly',
          billingType: 'pix',
        })
      ).rejects.toThrow('Plan not found')
    })

    it('should throw error if price not found for provider', async () => {
      mockCustomerService.getByOrganizationId.mockResolvedValue({ id: 'cust_1' })
      mockPlanService.getPlanById.mockResolvedValue({ id: 'plan_1' })
      mockPlanService.getPlanPrice.mockResolvedValue(null)

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
      })

      await expect(
        service.createSubscription({
          organizationId: 'org_1',
          planId: 'plan_1',
          interval: 'monthly',
          billingType: 'pix',
        })
      ).rejects.toThrow('Price not found')
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription in provider and database', async () => {
      const subscription = {
        id: 'sub_1',
        externalId: 'sub_asaas_123',
        provider: 'asaas',
        status: 'active',
      }
      mockSubscriptionService.getById.mockResolvedValue(subscription)
      mockProvider.cancelSubscription.mockResolvedValue({
        externalId: 'sub_asaas_123',
        status: 'canceled',
      })
      mockSubscriptionService.cancel.mockResolvedValue({
        ...subscription,
        status: 'canceled',
      })

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
      })

      const result = await service.cancelSubscription('sub_1', { immediate: true })

      expect(result.status).toBe('canceled')
      expect(mockProvider.cancelSubscription).toHaveBeenCalled()
    })
  })

  describe('tokenizeCard', () => {
    it('should tokenize card via provider', async () => {
      mockCustomerService.getExternalIdForProvider.mockResolvedValue('cus_asaas_123')
      mockProvider.tokenizeCard.mockResolvedValue({
        token: 'card_token_new',
        brand: 'VISA',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2028,
      })

      const { BillingService } = await import('../billing-service')
      const service = new BillingService({
        provider: mockProvider as never,
        planService: mockPlanService as never,
        customerService: mockCustomerService as never,
        subscriptionService: mockSubscriptionService as never,
      })

      const result = await service.tokenizeCard({
        billingCustomerId: 'cust_1',
        cardNumber: '4242424242424242',
        cardHolder: 'John Doe',
        expiryMonth: '12',
        expiryYear: '2028',
        cvv: '123',
      })

      expect(result.token).toBe('card_token_new')
      expect(result.brand).toBe('VISA')
      expect(mockProvider.tokenizeCard).toHaveBeenCalled()
    })
  })

  describe('resolveProvider', () => {
    it('should return asaas provider by default', async () => {
      const { BillingService } = await import('../billing-service')
      const service = new BillingService()

      expect(service.getProviderType()).toBe('asaas')
    })
  })
})
