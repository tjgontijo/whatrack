import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PaymentStatus } from '@prisma/client'

/**
 * InvoiceService Tests
 *
 * Tests for invoice database operations.
 */
describe('InvoiceService', () => {
  const mockPrisma = {
    invoice: {
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
    it('should return invoice by id with items', async () => {
      const mockInvoice = {
        id: 'inv_1',
        billingCustomerId: 'cust_1',
        totalCents: 9700,
        status: 'pending',
        items: [{ description: 'Subscription', quantity: 1, unitCents: 9700 }],
      }
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.getById('inv_1')

      expect(result).toEqual(mockInvoice)
      expect(mockPrisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        include: { items: true, payments: true },
      })
    })
  })

  describe('getByExternalId', () => {
    it('should return invoice by provider and external id', async () => {
      const mockInvoice = {
        id: 'inv_1',
        provider: 'asaas',
        externalId: 'pay_asaas_123',
        status: 'paid',
      }
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.getByExternalId('asaas', 'pay_asaas_123')

      expect(result).toEqual(mockInvoice)
      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { provider: 'asaas', externalId: 'pay_asaas_123' },
        include: { items: true },
      })
    })
  })

  describe('listBySubscription', () => {
    it('should return invoices for a subscription', async () => {
      const mockInvoices = [
        { id: 'inv_1', subscriptionId: 'sub_1', status: 'paid' },
        { id: 'inv_2', subscriptionId: 'sub_1', status: 'pending' },
      ]
      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.listBySubscription('sub_1')

      expect(result).toHaveLength(2)
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub_1' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('listByBillingCustomer', () => {
    it('should return invoices for a billing customer', async () => {
      const mockInvoices = [
        { id: 'inv_1', billingCustomerId: 'cust_1', status: 'paid' },
      ]
      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.listByBillingCustomer('cust_1')

      expect(result).toHaveLength(1)
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { billingCustomerId: 'cust_1' },
        include: { items: true, subscription: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('create', () => {
    it('should create a new invoice with items', async () => {
      const createData = {
        billingCustomerId: 'cust_1',
        subscriptionId: 'sub_1',
        provider: 'asaas' as const,
        externalId: 'pay_asaas_123',
        subtotalCents: 9700,
        totalCents: 9700,
        currency: 'BRL',
        status: 'pending' as const,
        items: [
          { description: 'Starter Plan - Monthly', quantity: 1, unitCents: 9700, totalCents: 9700 },
        ],
      }

      const mockInvoice = { id: 'inv_1', ...createData }
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.create(createData)

      expect(result.id).toBe('inv_1')
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: {
          billingCustomerId: 'cust_1',
          subscriptionId: 'sub_1',
          provider: 'asaas',
          externalId: 'pay_asaas_123',
          subtotalCents: 9700,
          totalCents: 9700,
          currency: 'BRL',
          status: 'pending',
          items: {
            create: [
              { description: 'Starter Plan - Monthly', quantity: 1, unitCents: 9700, totalCents: 9700 },
            ],
          },
        },
        include: { items: true },
      })
    })
  })

  describe('updateStatus', () => {
    it('should update invoice status', async () => {
      const mockInvoice = { id: 'inv_1', status: PaymentStatus.succeeded, paidAt: new Date() }
      mockPrisma.invoice.update.mockResolvedValue(mockInvoice)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.updateStatus('inv_1', PaymentStatus.succeeded)

      expect(result.status).toBe(PaymentStatus.succeeded)
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        data: { status: PaymentStatus.succeeded, paidAt: expect.any(Date) },
        include: { items: true },
      })
    })

    it('should not set paidAt for non-paid status', async () => {
      const mockInvoice = { id: 'inv_1', status: 'failed' }
      mockPrisma.invoice.update.mockResolvedValue(mockInvoice)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      await service.updateStatus('inv_1', 'failed')

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        data: { status: 'failed' },
        include: { items: true },
      })
    })
  })

  describe('markAsPaid', () => {
    it('should mark invoice as paid with timestamp', async () => {
      const paidAt = new Date('2025-01-15')
      const mockInvoice = { id: 'inv_1', status: PaymentStatus.succeeded, paidAt }
      mockPrisma.invoice.update.mockResolvedValue(mockInvoice)

      const { InvoiceService } = await import('../invoice-service')
      const service = new InvoiceService(mockPrisma as never)

      const result = await service.markAsPaid('inv_1', paidAt)

      expect(result.status).toBe(PaymentStatus.succeeded)
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        data: { status: PaymentStatus.succeeded, paidAt },
        include: { items: true },
      })
    })
  })
})
