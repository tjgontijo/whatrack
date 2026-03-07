import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { cancelSubscription } from '@/services/billing/billing-subscription.service'

describe('billing-subscription.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('schedules cancellation at period end without changing lifecycle status', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      organizationId: 'org-1',
      planType: 'starter',
      status: 'active',
      canceledAtPeriodEnd: false,
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
      nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
      eventLimitPerMonth: 200,
      eventsUsedInCurrentCycle: 10,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      canceledAt: null,
      provider: 'abacatepay',
      providerSubscriptionId: 'bill-1',
    })

    prismaMock.billingSubscription.update.mockResolvedValueOnce({
      status: 'active',
      canceledAtPeriodEnd: true,
      canceledAt: null,
    })

    const result = await cancelSubscription('org-1', true)

    expect(prismaMock.billingSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: {
        canceledAtPeriodEnd: true,
      },
      select: {
        status: true,
        canceledAtPeriodEnd: true,
        canceledAt: true,
      },
    })

    expect(result).toEqual({
      status: 'active',
      canceledAtPeriodEnd: true,
      canceledAt: null,
    })
  })

  it('cancels immediately when atPeriodEnd is false', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-2',
      organizationId: 'org-1',
      planType: 'pro',
      status: 'active',
      canceledAtPeriodEnd: false,
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
      nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
      eventLimitPerMonth: 500,
      eventsUsedInCurrentCycle: 40,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      canceledAt: null,
      provider: 'abacatepay',
      providerSubscriptionId: 'bill-2',
    })

    prismaMock.billingSubscription.update.mockResolvedValueOnce({
      status: 'canceled',
      canceledAtPeriodEnd: false,
      canceledAt: new Date('2026-03-07T10:00:00.000Z'),
    })

    const result = await cancelSubscription('org-1', false)

    expect(prismaMock.billingSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-2' },
      data: {
        status: 'canceled',
        canceledAtPeriodEnd: false,
        canceledAt: expect.any(Date),
      },
      select: {
        status: true,
        canceledAtPeriodEnd: true,
        canceledAt: true,
      },
    })

    expect(result).toEqual({
      status: 'canceled',
      canceledAtPeriodEnd: false,
      canceledAt: new Date('2026-03-07T10:00:00.000Z'),
    })
  })
})
