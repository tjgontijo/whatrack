import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  organizationProfile: {
    findUnique: vi.fn(),
  },
  organizationCompany: {
    findUnique: vi.fn(),
  },
  billingSubscription: {
    findUnique: vi.fn(),
  },
}))

const providerMock = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  getProviderId: vi.fn(() => 'stripe'),
}))

const ensurePaymentProvidersMock = vi.hoisted(() => vi.fn())
const getActiveProviderMock = vi.hoisted(() => vi.fn(() => providerMock))
const requireCheckoutReadyBillingPlanMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/billing/providers/init', () => ({
  ensurePaymentProviders: ensurePaymentProvidersMock,
  providerRegistry: {
    getActive: getActiveProviderMock,
  },
}))

vi.mock('@/services/billing/billing-plan-catalog.service', () => ({
  BillingPlanCatalogError: class BillingPlanCatalogError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message)
    }
  },
  requireCheckoutReadyBillingPlan: requireCheckoutReadyBillingPlanMock,
}))

import { createCheckoutSession } from '@/services/billing/billing-checkout.service'

describe('billing-checkout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireCheckoutReadyBillingPlanMock.mockResolvedValue({
      id: 'plan-base',
      slug: 'platform_base',
      name: 'WhaTrack Base',
      stripePriceId: 'price_base',
      syncStatus: 'synced',
      isActive: true,
      deletedAt: null,
      contactSalesOnly: false,
      kind: 'base',
    })
    prismaMock.billingSubscription.findUnique.mockResolvedValue(null)
  })

  it('creates a checkout session with resolved customer context and launch URLs', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: 'owner@whatrack.com',
      name: 'Thiago',
      phone: '11999999999',
    })
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce(null)
    prismaMock.organizationCompany.findUnique.mockResolvedValueOnce(null)
    providerMock.createCheckoutSession.mockResolvedValueOnce({
      id: 'cs_1',
      customerId: 'cust-1',
      url: 'https://checkout.stripe.com/c/pay/cs_1',
      expiresAt: new Date('2026-03-31T00:00:00.000Z'),
      method: 'card',
    })

    const result = await createCheckoutSession({
      organizationId: 'org-1',
      userId: 'user-1',
      planType: 'platform_base',
      origin: 'https://whatrack.com',
      redirectPath: '/dashboard/billing',
    })

    expect(providerMock.createCheckoutSession).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planType: 'platform_base',
      successUrl:
        'https://whatrack.com/billing/success?plan=platform_base&planName=WhaTrack+Base&next=%2Fdashboard%2Fbilling',
      returnUrl: 'https://whatrack.com/dashboard/billing',
      userEmail: 'owner@whatrack.com',
      userName: 'Thiago',
      userPhone: '11999999999',
      userTaxId: undefined,
      isPerson: false,
      skipTrial: false,
    })
    expect(result).toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_1',
      provider: 'stripe',
    })
  })

  it('skips trial in checkout when the organization already has a local subscription', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: 'owner@whatrack.com',
      name: 'Thiago',
      phone: '11999999999',
    })
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce(null)
    prismaMock.organizationCompany.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-local',
    })
    providerMock.createCheckoutSession.mockResolvedValueOnce({
      id: 'cs_2',
      customerId: 'cust-2',
      url: 'https://checkout.stripe.com/c/pay/cs_2',
      expiresAt: new Date('2026-03-31T00:00:00.000Z'),
      method: 'card',
    })

    await createCheckoutSession({
      organizationId: 'org-1',
      userId: 'user-1',
      planType: 'platform_base',
      origin: 'https://whatrack.com',
    })

    expect(providerMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        skipTrial: true,
      }),
    )
  })
})
