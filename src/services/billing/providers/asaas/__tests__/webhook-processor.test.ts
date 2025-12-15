import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PaymentStatus, SubscriptionStatus } from '@prisma/client'

/**
 * AsaasWebhookProcessor Tests
 *
 * Tests for processing Asaas webhook events.
 */
describe('AsaasWebhookProcessor', () => {
  const mockPrisma = {
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      update: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  describe('PAYMENT_CONFIRMED', () => {
    it('should mark payment as succeeded', async () => {
      const mockPayment = { id: 'pay_local_1', invoiceId: null }
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment)
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.succeeded })

      const { AsaasWebhookProcessor } = await import('../webhook-processor')
      const processor = new AsaasWebhookProcessor(mockPrisma as never)

      const result = await processor.process({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_asaas_123',
          customer: 'cus_123',
          status: 'CONFIRMED',
          value: 99.90,
          dueDate: '2025-01-15',
          confirmedDate: '2025-01-10',
          billingType: 'CREDIT_CARD',
        },
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Payment marked as successful')
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_local_1' },
        data: {
          status: PaymentStatus.succeeded,
          paidAt: expect.any(Date),
        },
      })
    })

    it('should update subscription to active when linked', async () => {
      const mockPayment = { id: 'pay_local_1', invoiceId: null }
      const mockSubscription = { id: 'sub_local_1' }
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment)
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.succeeded })
      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription)
      mockPrisma.subscription.update.mockResolvedValue({ ...mockSubscription, status: SubscriptionStatus.active })

      const { AsaasWebhookProcessor } = await import('../webhook-processor')
      const processor = new AsaasWebhookProcessor(mockPrisma as never)

      const result = await processor.process({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_asaas_123',
          customer: 'cus_123',
          subscription: 'sub_asaas_123',
          status: 'CONFIRMED',
          value: 99.90,
          dueDate: '2025-01-15',
          billingType: 'CREDIT_CARD',
        },
      })

      expect(result.success).toBe(true)
      expect(result.updatedEntities?.subscription).toBe('sub_local_1')
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_local_1' },
        data: { status: SubscriptionStatus.active },
      })
    })
  })

  describe('PAYMENT_OVERDUE', () => {
    it('should mark payment as failed', async () => {
      const mockPayment = { id: 'pay_local_1' }
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment)
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.failed })

      const { AsaasWebhookProcessor } = await import('../webhook-processor')
      const processor = new AsaasWebhookProcessor(mockPrisma as never)

      const result = await processor.process({
        event: 'PAYMENT_OVERDUE',
        payment: {
          id: 'pay_asaas_123',
          customer: 'cus_123',
          status: 'OVERDUE',
          value: 99.90,
          dueDate: '2025-01-15',
          billingType: 'BOLETO',
        },
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Payment marked as overdue')
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_local_1' },
        data: {
          status: PaymentStatus.failed,
          failureReason: 'Pagamento vencido',
        },
      })
    })

    it('should update subscription to past_due when linked', async () => {
      const mockPayment = { id: 'pay_local_1' }
      const mockSubscription = { id: 'sub_local_1' }
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment)
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.failed })
      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription)
      mockPrisma.subscription.update.mockResolvedValue({ ...mockSubscription, status: SubscriptionStatus.past_due })

      const { AsaasWebhookProcessor } = await import('../webhook-processor')
      const processor = new AsaasWebhookProcessor(mockPrisma as never)

      const result = await processor.process({
        event: 'PAYMENT_OVERDUE',
        payment: {
          id: 'pay_asaas_123',
          customer: 'cus_123',
          subscription: 'sub_asaas_123',
          status: 'OVERDUE',
          value: 99.90,
          dueDate: '2025-01-15',
          billingType: 'BOLETO',
        },
      })

      expect(result.updatedEntities?.subscription).toBe('sub_local_1')
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_local_1' },
        data: { status: SubscriptionStatus.past_due },
      })
    })
  })

  describe('PAYMENT_REFUNDED', () => {
    it('should mark payment as refunded', async () => {
      const mockPayment = { id: 'pay_local_1', invoiceId: 'inv_1' }
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment)
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.refunded })
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv_1', status: PaymentStatus.refunded })

      const { AsaasWebhookProcessor } = await import('../webhook-processor')
      const processor = new AsaasWebhookProcessor(mockPrisma as never)

      const result = await processor.process({
        event: 'PAYMENT_REFUNDED',
        payment: {
          id: 'pay_asaas_123',
          customer: 'cus_123',
          status: 'REFUNDED',
          value: 99.90,
          dueDate: '2025-01-15',
          billingType: 'CREDIT_CARD',
        },
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Payment marked as refunded')
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_local_1' },
        data: {
          status: PaymentStatus.refunded,
          refundedAt: expect.any(Date),
        },
      })
    })
  })

  describe('Unknown events', () => {
    it('should acknowledge unknown events without processing', async () => {
      const { AsaasWebhookProcessor } = await import('../webhook-processor')
      const processor = new AsaasWebhookProcessor(mockPrisma as never)

      const result = await processor.process({
        event: 'PAYMENT_BANK_SLIP_VIEWED' as never,
        payment: {
          id: 'pay_asaas_123',
          customer: 'cus_123',
          status: 'PENDING',
          value: 99.90,
          dueDate: '2025-01-15',
          billingType: 'BOLETO',
        },
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('acknowledged but not processed')
    })
  })
})
