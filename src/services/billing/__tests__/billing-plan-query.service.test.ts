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

  it('lists billing plans with pagination and mapped counts', async () => {
    prismaMock.billingPlan.findMany.mockResolvedValueOnce([
      {
        id: 'plan_1',
        name: 'Starter',
        slug: 'starter',
        description: 'Plano inicial',
        metadata: {
          subtitle: 'Até 200 eventos / mês',
          cta: 'Testar grátis por 14 dias',
          trialDays: 14,
          features: ['200 eventos/mês'],
          additionals: ['R$ 0,25 por evento extra'],
        },
        monthlyPrice: { toString: () => '97.00' },
        currency: 'BRL',
        eventLimitPerMonth: 200,
        overagePricePerEvent: { toString: () => '0.25' },
        maxWhatsAppNumbers: 1,
        maxAdAccounts: 1,
        maxTeamMembers: 2,
        supportLevel: 'email',
        stripeProductId: 'prod_1',
        stripePriceId: 'price_1',
        syncStatus: 'synced',
        syncError: null,
        syncedAt: new Date('2026-03-08T12:00:00.000Z'),
        isActive: true,
        isHighlighted: false,
        contactSalesOnly: false,
        displayOrder: 0,
        deletedAt: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        _count: {
          subscriptions: 3,
        },
      },
    ])
    prismaMock.billingPlan.count.mockResolvedValueOnce(1)

    const result = await listBillingPlans({
      page: 1,
      pageSize: 10,
      status: 'all',
      syncStatus: 'all',
    })

    expect(prismaMock.billingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    )
    expect(result.totalPages).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 'plan_1',
      slug: 'starter',
      trialDays: 14,
      subtitle: 'Até 200 eventos / mês',
      monthlyPrice: '97.00',
      overagePricePerEvent: '0.25',
      subscriptionCount: 3,
    })
  })

  it('applies search and status filters to the prisma query', async () => {
    prismaMock.billingPlan.findMany.mockResolvedValueOnce([])
    prismaMock.billingPlan.count.mockResolvedValueOnce(0)

    await listBillingPlans({
      page: 2,
      pageSize: 5,
      query: 'pro',
      status: 'active',
      syncStatus: 'pending',
    })

    expect(prismaMock.billingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          isActive: true,
          deletedAt: null,
          syncStatus: 'pending',
          OR: expect.arrayContaining([
            { name: { contains: 'pro', mode: 'insensitive' } },
            { slug: { contains: 'pro', mode: 'insensitive' } },
          ]),
        }),
      }),
    )
  })
})
