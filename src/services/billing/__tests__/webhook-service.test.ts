import { describe, expect, it, vi, beforeEach } from 'vitest'
import { BillingProvider } from '@prisma/client'

/**
 * WebhookService Tests
 *
 * Tests for webhook event storage and idempotency.
 */
describe('WebhookService', () => {
  const mockPrisma = {
    webhookEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  describe('getByEventId', () => {
    it('should return webhook event by provider and event id', async () => {
      const mockEvent = {
        id: 'evt_1',
        provider: 'asaas' as BillingProvider,
        eventId: 'pay_123',
        eventType: 'PAYMENT_CONFIRMED',
        processed: false,
        payload: { event: 'PAYMENT_CONFIRMED' },
      }
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(mockEvent)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.getByEventId('asaas', 'pay_123')

      expect(result).toEqual(mockEvent)
      expect(mockPrisma.webhookEvent.findUnique).toHaveBeenCalledWith({
        where: {
          provider_eventId: {
            provider: 'asaas',
            eventId: 'pay_123',
          },
        },
      })
    })
  })

  describe('isProcessed', () => {
    it('should return true for processed events', async () => {
      const mockEvent = { processed: true }
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(mockEvent)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.isProcessed('asaas', 'pay_123')

      expect(result).toBe(true)
    })

    it('should return false for unprocessed events', async () => {
      const mockEvent = { processed: false }
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(mockEvent)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.isProcessed('asaas', 'pay_123')

      expect(result).toBe(false)
    })

    it('should return false for non-existent events', async () => {
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.isProcessed('asaas', 'pay_123')

      expect(result).toBe(false)
    })
  })

  describe('store', () => {
    it('should upsert webhook event', async () => {
      const mockEvent = {
        id: 'evt_1',
        provider: 'asaas' as BillingProvider,
        eventId: 'pay_123',
        eventType: 'PAYMENT_CONFIRMED',
        payload: { event: 'PAYMENT_CONFIRMED' },
      }
      mockPrisma.webhookEvent.upsert.mockResolvedValue(mockEvent)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.store({
        provider: 'asaas',
        eventId: 'pay_123',
        eventType: 'PAYMENT_CONFIRMED',
        payload: { event: 'PAYMENT_CONFIRMED' },
      })

      expect(result).toEqual(mockEvent)
      expect(mockPrisma.webhookEvent.upsert).toHaveBeenCalledWith({
        where: {
          provider_eventId: {
            provider: 'asaas',
            eventId: 'pay_123',
          },
        },
        create: {
          provider: 'asaas',
          eventId: 'pay_123',
          eventType: 'PAYMENT_CONFIRMED',
          payload: { event: 'PAYMENT_CONFIRMED' },
        },
        update: {
          eventType: 'PAYMENT_CONFIRMED',
          payload: { event: 'PAYMENT_CONFIRMED' },
        },
      })
    })
  })

  describe('markProcessed', () => {
    it('should mark webhook event as processed', async () => {
      const mockEvent = {
        id: 'evt_1',
        processed: true,
        processedAt: new Date(),
        error: null,
      }
      mockPrisma.webhookEvent.update.mockResolvedValue(mockEvent)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.markProcessed('asaas', 'pay_123')

      expect(result.processed).toBe(true)
      expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
        where: {
          provider_eventId: {
            provider: 'asaas',
            eventId: 'pay_123',
          },
        },
        data: {
          processed: true,
          processedAt: expect.any(Date),
          error: null,
        },
      })
    })
  })

  describe('markFailed', () => {
    it('should mark webhook event as failed with error', async () => {
      const mockEvent = {
        id: 'evt_1',
        processed: false,
        error: 'Processing failed',
      }
      mockPrisma.webhookEvent.update.mockResolvedValue(mockEvent)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.markFailed('asaas', 'pay_123', 'Processing failed')

      expect(result.error).toBe('Processing failed')
      expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith({
        where: {
          provider_eventId: {
            provider: 'asaas',
            eventId: 'pay_123',
          },
        },
        data: {
          error: 'Processing failed',
        },
      })
    })
  })

  describe('getUnprocessed', () => {
    it('should return unprocessed webhook events', async () => {
      const mockEvents = [
        { id: 'evt_1', processed: false },
        { id: 'evt_2', processed: false },
      ]
      mockPrisma.webhookEvent.findMany.mockResolvedValue(mockEvents)

      const { WebhookService } = await import('../webhook-service')
      const service = new WebhookService(mockPrisma as never)

      const result = await service.getUnprocessed('asaas', 10)

      expect(result).toEqual(mockEvents)
      expect(mockPrisma.webhookEvent.findMany).toHaveBeenCalledWith({
        where: {
          processed: false,
          provider: 'asaas',
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      })
    })
  })
})
