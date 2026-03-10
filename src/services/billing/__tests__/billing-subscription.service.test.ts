import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  project: {
    count: vi.fn(),
  },
  whatsAppConfig: {
    groupBy: vi.fn(),
  },
  metaAdAccount: {
    groupBy: vi.fn(),
    count: vi.fn(),
  },
}))

const ensurePaymentProvidersMock = vi.hoisted(() => vi.fn())
const cancelSubscriptionProviderMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/billing/providers/init', () => ({
  ensurePaymentProviders: ensurePaymentProvidersMock,
  providerRegistry: {
    getActive: vi.fn(() => ({
      cancelSubscription: cancelSubscriptionProviderMock,
    })),
  },
}))

import { cancelSubscription } from '@/services/billing/billing-subscription.service'

describe('billing-subscription.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.project.count.mockResolvedValue(0)
    prismaMock.whatsAppConfig.groupBy.mockResolvedValue([])
    prismaMock.metaAdAccount.groupBy.mockResolvedValue([])
    prismaMock.metaAdAccount.count.mockResolvedValue(0)
  })

  it('schedules cancellation at period end without changing lifecycle status', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      organizationId: 'org-1',
      status: 'active',
      canceledAtPeriodEnd: false,
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
      nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
      trialEndsAt: null,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      canceledAt: null,
      provider: 'stripe',
      providerSubscriptionId: 'sub_1',
      plan: {
        id: 'plan-base',
        slug: 'platform_base',
        name: 'WhaTrack Base',
        includedProjects: 3,
        includedWhatsAppPerProject: 1,
        includedMetaAdAccountsPerProject: 1,
        includedConversionsPerProject: 300,
        includedAiCreditsPerProject: 10000,
      },
      items: [],
    })

    prismaMock.billingSubscription.update.mockResolvedValueOnce({
      status: 'active',
      canceledAtPeriodEnd: true,
      canceledAt: null,
    })

    const result = await cancelSubscription('org-1', true)

    expect(ensurePaymentProvidersMock).toHaveBeenCalledTimes(1)
    expect(cancelSubscriptionProviderMock).toHaveBeenCalledWith('sub_1', true)
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
      status: 'active',
      canceledAtPeriodEnd: false,
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
      nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
      trialEndsAt: null,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      canceledAt: null,
      provider: 'stripe',
      providerSubscriptionId: 'sub_2',
      plan: {
        id: 'plan-base',
        slug: 'platform_base',
        name: 'WhaTrack Base',
        includedProjects: 3,
        includedWhatsAppPerProject: 1,
        includedMetaAdAccountsPerProject: 1,
        includedConversionsPerProject: 300,
        includedAiCreditsPerProject: 10000,
      },
      items: [],
    })

    prismaMock.billingSubscription.update.mockResolvedValueOnce({
      status: 'canceled',
      canceledAtPeriodEnd: false,
      canceledAt: new Date('2026-03-07T10:00:00.000Z'),
    })

    const result = await cancelSubscription('org-1', false)

    expect(ensurePaymentProvidersMock).toHaveBeenCalledTimes(1)
    expect(cancelSubscriptionProviderMock).toHaveBeenCalledWith('sub_2', false)
    expect(result).toEqual({
      status: 'canceled',
      canceledAtPeriodEnd: false,
      canceledAt: new Date('2026-03-07T10:00:00.000Z'),
    })
  })
})
