import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * BillingCustomerService Tests
 *
 * Tests for billing customer management operations.
 */
describe('BillingCustomerService', () => {
  const mockPrisma = {
    billingCustomer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    billingCustomerExternal: {
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getById', () => {
    it('should return billing customer by id', async () => {
      const mockCustomer = {
        id: 'cust_1',
        organizationId: 'org_1',
        email: 'test@example.com',
        externalCustomers: [],
      }
      mockPrisma.billingCustomer.findUnique.mockResolvedValue(mockCustomer)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.getById('cust_1')

      expect(result).toEqual(mockCustomer)
      expect(mockPrisma.billingCustomer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust_1' },
        include: { externalCustomers: true, paymentMethods: true },
      })
    })
  })

  describe('getByOrganizationId', () => {
    it('should return billing customer by organization id', async () => {
      const mockCustomer = {
        id: 'cust_1',
        organizationId: 'org_1',
        email: 'test@example.com',
      }
      mockPrisma.billingCustomer.findUnique.mockResolvedValue(mockCustomer)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.getByOrganizationId('org_1')

      expect(result).toEqual(mockCustomer)
      expect(mockPrisma.billingCustomer.findUnique).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        include: { externalCustomers: true, paymentMethods: true },
      })
    })
  })

  describe('getByExternalId', () => {
    it('should return billing customer by provider and external id', async () => {
      const mockExternal = {
        id: 'ext_1',
        billingCustomerId: 'cust_1',
        provider: 'asaas',
        externalId: 'cus_asaas_123',
        billingCustomer: {
          id: 'cust_1',
          email: 'test@example.com',
        },
      }
      mockPrisma.billingCustomerExternal.findFirst.mockResolvedValue(mockExternal)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.getByExternalId('asaas', 'cus_asaas_123')

      expect(result?.id).toBe('cust_1')
      expect(mockPrisma.billingCustomerExternal.findFirst).toHaveBeenCalledWith({
        where: { provider: 'asaas', externalId: 'cus_asaas_123' },
        include: { billingCustomer: { include: { externalCustomers: true } } },
      })
    })
  })

  describe('create', () => {
    it('should create a new billing customer', async () => {
      const createData = {
        organizationId: 'org_1',
        email: 'test@example.com',
        name: 'Test Company',
        taxId: '12345678900',
      }

      const mockCustomer = { id: 'cust_1', ...createData, externalCustomers: [] }
      mockPrisma.billingCustomer.create.mockResolvedValue(mockCustomer)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.create(createData)

      expect(result).toEqual(mockCustomer)
      expect(mockPrisma.billingCustomer.create).toHaveBeenCalledWith({
        data: createData,
        include: { externalCustomers: true },
      })
    })
  })

  describe('update', () => {
    it('should update billing customer data', async () => {
      const mockCustomer = {
        id: 'cust_1',
        email: 'updated@example.com',
        name: 'Updated Name',
      }
      mockPrisma.billingCustomer.update.mockResolvedValue(mockCustomer)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.update('cust_1', {
        email: 'updated@example.com',
        name: 'Updated Name',
      })

      expect(result.email).toBe('updated@example.com')
      expect(mockPrisma.billingCustomer.update).toHaveBeenCalledWith({
        where: { id: 'cust_1' },
        data: { email: 'updated@example.com', name: 'Updated Name' },
        include: { externalCustomers: true },
      })
    })
  })

  describe('addExternalId', () => {
    it('should add external customer id for a provider', async () => {
      const mockExternal = {
        id: 'ext_1',
        billingCustomerId: 'cust_1',
        provider: 'asaas',
        externalId: 'cus_asaas_123',
      }
      mockPrisma.billingCustomerExternal.create.mockResolvedValue(mockExternal)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.addExternalId('cust_1', 'asaas', 'cus_asaas_123')

      expect(result.externalId).toBe('cus_asaas_123')
      expect(mockPrisma.billingCustomerExternal.create).toHaveBeenCalledWith({
        data: {
          billingCustomerId: 'cust_1',
          provider: 'asaas',
          externalId: 'cus_asaas_123',
        },
      })
    })
  })

  describe('upsertExternalId', () => {
    it('should upsert external customer id for a provider', async () => {
      const mockExternal = {
        id: 'ext_1',
        billingCustomerId: 'cust_1',
        provider: 'asaas',
        externalId: 'cus_asaas_new',
      }
      mockPrisma.billingCustomerExternal.upsert.mockResolvedValue(mockExternal)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.upsertExternalId('cust_1', 'asaas', 'cus_asaas_new')

      expect(result.externalId).toBe('cus_asaas_new')
      expect(mockPrisma.billingCustomerExternal.upsert).toHaveBeenCalledWith({
        where: {
          billingCustomerId_provider: {
            billingCustomerId: 'cust_1',
            provider: 'asaas',
          },
        },
        update: { externalId: 'cus_asaas_new' },
        create: {
          billingCustomerId: 'cust_1',
          provider: 'asaas',
          externalId: 'cus_asaas_new',
        },
      })
    })
  })

  describe('getExternalIdForProvider', () => {
    it('should return external id for a specific provider', async () => {
      const mockCustomer = {
        id: 'cust_1',
        externalCustomers: [
          { provider: 'asaas', externalId: 'cus_asaas_123' },
          { provider: 'stripe', externalId: 'cus_stripe_456' },
        ],
      }
      mockPrisma.billingCustomer.findUnique.mockResolvedValue(mockCustomer)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.getExternalIdForProvider('cust_1', 'asaas')

      expect(result).toBe('cus_asaas_123')
    })

    it('should return null when no external id exists for provider', async () => {
      const mockCustomer = {
        id: 'cust_1',
        externalCustomers: [],
      }
      mockPrisma.billingCustomer.findUnique.mockResolvedValue(mockCustomer)

      const { BillingCustomerService } = await import('../billing-customer-service')
      const service = new BillingCustomerService(mockPrisma as never)

      const result = await service.getExternalIdForProvider('cust_1', 'stripe')

      expect(result).toBeNull()
    })
  })
})
