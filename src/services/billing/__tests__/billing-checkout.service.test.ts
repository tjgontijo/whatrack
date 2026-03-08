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
}))

const providerMock = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  getProviderId: vi.fn(() => 'abacatepay'),
}))

const ensurePaymentProvidersMock = vi.hoisted(() => vi.fn())
const createSubscriptionMock = vi.hoisted(() => vi.fn())
const getActiveProviderMock = vi.hoisted(() => vi.fn(() => providerMock))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/billing/providers/init', () => ({
  ensurePaymentProviders: ensurePaymentProvidersMock,
  providerRegistry: {
    getActive: getActiveProviderMock,
  },
}))

vi.mock('@/services/billing/billing-subscription.service', () => ({
  createSubscription: createSubscriptionMock,
}))

import { createCheckoutSession } from '@/services/billing/billing-checkout.service'

describe('billing-checkout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a checkout session with resolved customer context and launch URLs', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: 'owner@whatrack.com',
      name: 'Thiago',
      phone: '11999999999',
    })
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce({
      cpf: '12345678901',
    })
    prismaMock.organizationCompany.findUnique.mockResolvedValueOnce(null)
    providerMock.createCheckoutSession.mockResolvedValueOnce({
      id: 'bill-1',
      customerId: 'cust-1',
      url: 'https://checkout.abacatepay.com/bill-1',
      expiresAt: new Date('2026-03-31T00:00:00.000Z'),
      method: 'card',
    })

    const result = await createCheckoutSession({
      organizationId: 'org-1',
      userId: 'user-1',
      planType: 'starter',
      origin: 'https://whatrack.com',
      redirectPath: '/dashboard/billing',
    })

    expect(ensurePaymentProvidersMock).toHaveBeenCalledTimes(1)
    expect(providerMock.createCheckoutSession).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planType: 'starter',
      successUrl: 'https://whatrack.com/billing/success?plan=starter&next=%2Fdashboard%2Fbilling',
      returnUrl: 'https://whatrack.com/dashboard/billing',
      userEmail: 'owner@whatrack.com',
      userName: 'Thiago',
      userPhone: '11999999999',
      userTaxId: '12345678901',
      isPerson: true,
    })
    expect(createSubscriptionMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planType: 'starter',
      provider: 'abacatepay',
      providerCustomerId: 'cust-1',
      providerSubscriptionId: 'bill-1',
      status: 'paused',
    })
    expect(result).toEqual({
      url: 'https://checkout.abacatepay.com/bill-1',
      provider: 'abacatepay',
    })
  })

  it('fails fast when the organization has no tax id for billing', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      email: 'owner@whatrack.com',
      name: 'Thiago',
      phone: '11999999999',
    })
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce(null)
    prismaMock.organizationCompany.findUnique.mockResolvedValueOnce(null)

    await expect(
      createCheckoutSession({
        organizationId: 'org-1',
        userId: 'user-1',
        planType: 'pro',
        origin: 'https://whatrack.com',
      })
    ).rejects.toMatchObject({
        message: 'Organization tax ID (CPF or CNPJ) is required for checkout',
        status: 400,
      })

    expect(providerMock.createCheckoutSession).not.toHaveBeenCalled()
    expect(createSubscriptionMock).not.toHaveBeenCalled()
  })
})
