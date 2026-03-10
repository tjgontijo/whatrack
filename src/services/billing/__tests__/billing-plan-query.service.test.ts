import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingPlan: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { listBillingPlans } from '@/services/billing/billing-plan-query.service'

describe('billing-plan-query.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists billing plans with pagination and mapped subscription counts', async () => {
    prismaMock.billingPlan.findMany.mockResolvedValueOnce([
      {
        id: 'plan_1',
        name: 'WhaTrack Base',
        slug: 'platform_base',
        description: 'Plano base',
        kind: 'base',
        addonType: null,
        metadata: {
          subtitle: 'Até 3 clientes ativos incluídos',
          cta: 'Teste grátis por 14 dias',
          trialDays: 14,
          features: ['3 clientes ativos incluídos'],
          additionals: ['Projeto adicional por R$ 97/mês'],
        },
        monthlyPrice: { toString: () => '497.00' },
        currency: 'BRL',
        includedProjects: 3,
        includedWhatsAppPerProject: 1,
        includedMetaAdAccountsPerProject: 1,
        includedConversionsPerProject: 300,
        includedAiCreditsPerProject: 10000,
        supportLevel: 'priority',
        stripeProductId: 'prod_1',
        stripePriceId: 'price_1',
        syncStatus: 'synced',
        syncError: null,
        syncedAt: new Date('2026-03-08T12:00:00.000Z'),
        isActive: true,
        isHighlighted: true,
        contactSalesOnly: false,
        displayOrder: 0,
        deletedAt: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        _count: {
          subscriptions: 3,
          subscriptionItems: 2,
        },
      },
    ])
    prismaMock.billingPlan.count.mockResolvedValueOnce(1)

    const result = await listBillingPlans({
      page: 1,
      pageSize: 10,
      status: 'all',
      syncStatus: 'all',
      kind: 'all',
    })

    expect(result.totalPages).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 'plan_1',
      slug: 'platform_base',
      kind: 'base',
      trialDays: 14,
      subtitle: 'Até 3 clientes ativos incluídos',
      monthlyPrice: '497.00',
      subscriptionCount: 5,
    })
  })

  it('applies search, status and kind filters to the prisma query', async () => {
    prismaMock.billingPlan.findMany.mockResolvedValueOnce([])
    prismaMock.billingPlan.count.mockResolvedValueOnce(0)

    await listBillingPlans({
      page: 2,
      pageSize: 5,
      query: 'base',
      status: 'active',
      syncStatus: 'pending',
      kind: 'base',
    })

    expect(prismaMock.billingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          isActive: true,
          deletedAt: null,
          syncStatus: 'pending',
          kind: 'base',
        }),
      }),
    )
  })
})
