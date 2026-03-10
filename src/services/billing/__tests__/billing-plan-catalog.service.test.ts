import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingPlan: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'

describe('billing-plan-catalog.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps public plans with trial and metadata fallback', async () => {
    prismaMock.billingPlan.findMany.mockResolvedValueOnce([
      {
        id: 'plan_1',
        name: 'Starter',
        slug: 'starter',
        description: 'Plano inicial',
        monthlyPrice: 97,
        currency: 'BRL',
        eventLimitPerMonth: 200,
        overagePricePerEvent: 0.25,
        maxWhatsAppNumbers: 1,
        maxAdAccounts: 1,
        maxTeamMembers: 2,
        supportLevel: 'email',
        stripeProductId: 'prod_1',
        stripePriceId: 'price_1',
        syncStatus: 'synced',
        syncError: null,
        syncedAt: null,
        isActive: true,
        isHighlighted: false,
        contactSalesOnly: false,
        displayOrder: 0,
        metadata: {
          trialDays: 14,
          cta: 'Testar grátis por 14 dias',
          features: ['200 eventos/mês'],
        },
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await listPublicBillingPlans()

    expect(result[0]).toMatchObject({
      slug: 'starter',
      trialDays: 14,
      cta: 'Testar grátis por 14 dias',
      features: ['200 eventos/mês'],
    })
  })
})
