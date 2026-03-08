import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingWebhookLog: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  billingSubscription: {
    findUnique: vi.fn(),
  },
}))

const updateSubscriptionStatusMock = vi.hoisted(() => vi.fn())
const createSubscriptionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/billing/billing-subscription.service', () => ({
  updateSubscriptionStatus: updateSubscriptionStatusMock,
  createSubscription: createSubscriptionMock,
}))

import { handlePaymentWebhook } from '@/services/billing/handlers/billing-webhook.handler'

describe('billing-webhook.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns idempotent success when the event was already processed', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce({
      id: 'log-1',
      isProcessed: true,
    })

    const result = await handlePaymentWebhook(
      {
        id: 'evt-1',
        type: 'billing.paid',
        timestamp: '2026-03-01T00:00:00.000Z',
        data: {
          billing: {
            id: 'bill-1',
            status: 'PAID',
            amount: 100,
          },
        },
      },
      'abacatepay'
    )

    expect(result).toEqual({
      processed: false,
      eventId: 'evt-1',
      message: 'Webhook already processed',
    })
    expect(prismaMock.billingWebhookLog.create).not.toHaveBeenCalled()
    expect(prismaMock.billingWebhookLog.update).not.toHaveBeenCalled()
    expect(updateSubscriptionStatusMock).not.toHaveBeenCalled()
  })

  it('processes a valid delayed billing webhook instead of discarding it by age', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingWebhookLog.create.mockResolvedValueOnce({
      id: 'log-1',
    })
    prismaMock.billingWebhookLog.update.mockResolvedValueOnce({
      id: 'log-1',
      isProcessed: true,
    })
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'paused',
    })

    const result = await handlePaymentWebhook(
      {
        id: 'evt-2',
        type: 'billing.paid',
        timestamp: '2026-01-01T00:00:00.000Z',
        data: {
          billing: {
            id: 'bill-2',
            status: 'PAID',
            amount: 19900,
            products: [
              {
                externalId: 'org:org-1:plan:starter',
                name: 'Starter',
              },
            ],
            customer: {
              id: 'cust-1',
            },
          },
        },
      },
      'abacatepay'
    )

    expect(prismaMock.billingWebhookLog.create).toHaveBeenCalledWith({
      data: {
        provider: 'abacatepay',
        eventId: 'evt-2',
        eventType: 'billing.paid',
        payload: expect.any(Object),
      },
    })
    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith('sub-1', 'active')
    expect(createSubscriptionMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      processed: true,
      eventId: 'evt-2',
      message: 'Successfully processed billing.paid webhook',
    })
  })
})
