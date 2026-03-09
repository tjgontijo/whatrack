import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  billingEventUsage: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const closeExpiredSubscriptionCycleIfNeededMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/billing/billing-overage-closeout.service', () => ({
  closeExpiredSubscriptionCycleIfNeeded: closeExpiredSubscriptionCycleIfNeededMock,
}))

import { recordEvent } from '@/services/billing/billing-metering.service'

describe('billing-metering.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.billingSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      eventLimitPerMonth: 200,
      eventsUsedInCurrentCycle: 42,
      nextResetDate: new Date('2026-04-01T00:00:00.000Z'),
      planType: 'starter',
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
    })

    prismaMock.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    )
  })

  it('does not increment usage twice when the same external id is received again', async () => {
    prismaMock.billingEventUsage.findUnique.mockResolvedValueOnce({ id: 'evt-1' })

    await recordEvent({
      organizationId: 'org-1',
      eventType: 'purchase_confirmed',
      externalId: 'sale-123',
    })

    expect(prismaMock.billingEventUsage.findUnique).toHaveBeenCalledWith({
      where: {
        subscriptionId_externalId: {
          subscriptionId: 'sub-1',
          externalId: 'sale-123',
        },
      },
      select: { id: true },
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('records the event with external id and increments the cycle usage once', async () => {
    prismaMock.billingEventUsage.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.update.mockResolvedValueOnce({ id: 'sub-1' })
    prismaMock.billingEventUsage.create.mockResolvedValueOnce({ id: 'evt-2' })

    await recordEvent({
      organizationId: 'org-1',
      eventType: 'lead_qualified',
      externalId: 'lead-42',
    })

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.billingSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: {
        eventsUsedInCurrentCycle: 43,
      },
    })
    expect(prismaMock.billingEventUsage.create).toHaveBeenCalledWith({
      data: {
        subscriptionId: 'sub-1',
        eventType: 'lead_qualified',
        externalId: 'lead-42',
        eventCount: 1,
        isOverage: false,
        chargedAmount: expect.anything(),
        billingCycle: '2026-03',
      },
    })
    expect(closeExpiredSubscriptionCycleIfNeededMock).not.toHaveBeenCalled()
  })
})
