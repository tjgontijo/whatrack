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

  it('maps public base plans with included entitlements', async () => {
    prismaMock.billingPlan.findMany.mockResolvedValueOnce([
      {
        id: 'plan_1',
        name: 'WhaTrack Base',
        slug: 'platform_base',
        description: 'Plano base',
        kind: 'base',
        addonType: null,
        monthlyPrice: 497,
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
        syncedAt: null,
        isActive: true,
        isHighlighted: true,
        contactSalesOnly: false,
        displayOrder: 0,
        metadata: {
          trialDays: 14,
          cta: 'Teste grátis por 14 dias',
          features: ['3 clientes ativos incluídos'],
          additionals: ['Projeto adicional por R$ 97/mês'],
        },
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await listPublicBillingPlans()

    expect(result[0]).toMatchObject({
      slug: 'platform_base',
      kind: 'base',
      trialDays: 14,
      includedProjects: 3,
      includedConversionsPerProject: 300,
      includedAiCreditsPerProject: 10000,
    })
  })

  it('returns an empty catalog when billing tables are not ready yet', async () => {
    prismaMock.billingPlan.findMany.mockRejectedValueOnce({ code: 'P2021' })

    await expect(listPublicBillingPlans()).resolves.toEqual([])
  })
})
