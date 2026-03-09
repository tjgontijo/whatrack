import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  member: {
    findFirst: vi.fn(),
  },
}))

const getMeAccountMock = vi.hoisted(() => vi.fn())
const getOrganizationMeMock = vi.hoisted(() => vi.fn())
const getActiveSubscriptionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))
vi.mock('@/services/me/me-account.service', () => ({
  getMeAccount: getMeAccountMock,
}))
vi.mock('@/services/organizations/organization.service', () => ({
  getOrganizationMe: getOrganizationMeMock,
}))
vi.mock('@/services/billing/billing-subscription.service', () => ({
  getActiveSubscription: getActiveSubscriptionMock,
  SubscriptionNotFoundError: class SubscriptionNotFoundError extends Error {},
}))

import { getAccountSummary } from '@/services/account/account-summary.service'

describe('getAccountSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns account data without organization payload when there is no active organization', async () => {
    getMeAccountMock.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Thiago',
      email: 'thiago@whatrack.com',
      phone: '11999999999',
      updatedAt: '2026-03-08T12:00:00.000Z',
    })

    const result = await getAccountSummary({
      userId: 'user-1',
      organizationId: null,
    })

    expect(result).toEqual({
      account: {
        id: 'user-1',
        name: 'Thiago',
        email: 'thiago@whatrack.com',
        phone: '11999999999',
        updatedAt: '2026-03-08T12:00:00.000Z',
      },
      organization: null,
      subscription: null,
    })
    expect(prismaMock.member.findFirst).not.toHaveBeenCalled()
  })

  it('aggregates account, organization and subscription for the first render', async () => {
    getMeAccountMock.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Thiago',
      email: 'thiago@whatrack.com',
      phone: '11999999999',
      updatedAt: '2026-03-08T12:00:00.000Z',
    })
    prismaMock.member.findFirst.mockResolvedValueOnce({
      id: 'member-1',
      role: 'owner',
    })
    getOrganizationMeMock.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Empresa Exemplo',
      organizationType: 'pessoa_juridica',
      documentType: 'cnpj',
      documentNumber: '11222333000181',
      legalName: 'Empresa Exemplo LTDA',
      tradeName: 'Empresa Exemplo',
      taxStatus: 'ATIVA',
      city: 'Sao Paulo',
      state: 'SP',
      currentUserRole: 'owner',
      updatedAt: '2026-03-08T12:00:00.000Z',
    })
    getActiveSubscriptionMock.mockResolvedValueOnce({
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
      provider: 'stripe',
      providerSubscriptionId: 'sub-1',
    })

    const result = await getAccountSummary({
      userId: 'user-1',
      organizationId: 'org-1',
    })

    expect(result.account?.email).toBe('thiago@whatrack.com')
    expect(result.organization?.currentUserRole).toBe('owner')
    expect(result.subscription?.planType).toBe('starter')
    expect(getOrganizationMeMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      memberId: 'member-1',
      role: 'owner',
    })
  })
})
