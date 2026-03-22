import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  billingPlan: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

const auditLogMock = vi.hoisted(() => vi.fn())
const getBillingPlanDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/audit/audit.service', () => ({
  auditService: {
    log: auditLogMock,
  },
}))

vi.mock('@/services/billing/billing-plan-query.service', () => ({
  getBillingPlanDetail: getBillingPlanDetailMock,
}))

import {
  archiveBillingPlan,
  createBillingPlan,
  updateBillingPlan,
} from '@/services/billing/billing-plan.service'

describe('billing-plan.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a base billing plan and writes audit log', async () => {
    prismaMock.billingPlan.findFirst.mockResolvedValueOnce(null)
    prismaMock.billingPlan.create.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'WhaTrack Base',
      slug: 'platform_base',
      kind: 'base',
      addonType: null,
      monthlyPrice: { toString: () => '497.00' },
      currency: 'BRL',
      metadata: {},
    })
    getBillingPlanDetailMock.mockResolvedValueOnce({ id: 'plan_1' })

    const result = await createBillingPlan(
      {
        name: 'WhaTrack Base',
        slug: 'platform_base',
        description: 'Plano base para agências',
        kind: 'base',
        addonType: null,
        subtitle: 'Até 3 clientes ativos incluídos',
        cta: 'Teste grátis por 14 dias',
        monthlyPrice: 497,
        currency: 'BRL',
        includedProjects: 3,
        includedWhatsAppPerProject: 1,
        includedMetaAdAccountsPerProject: 1,
        includedConversionsPerProject: 300,
        supportLevel: 'priority',
        displayOrder: 0,
        isHighlighted: true,
        contactSalesOnly: false,
        isActive: true,
        trialDays: 14,
        features: ['3 clientes ativos incluídos'],
        additionals: ['Projeto adicional por R$ 97/mês'],
      },
      'user-1',
    )

    expect(prismaMock.billingPlan.create).toHaveBeenCalled()
    expect(auditLogMock).toHaveBeenCalled()
    expect(result).toEqual({ id: 'plan_1' })
  })

  it('marks sync as pending when a stripe-relevant field changes', async () => {
    prismaMock.billingPlan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'WhaTrack Base',
      slug: 'platform_base',
      description: 'Plano base',
      kind: 'base',
      addonType: null,
      monthlyPrice: 497,
      currency: 'BRL',
      supportLevel: 'priority',
      displayOrder: 0,
      isActive: true,
      isHighlighted: true,
      contactSalesOnly: false,
      stripeProductId: 'prod_1',
      stripePriceId: 'price_1',
      syncStatus: 'synced',
      metadata: {},
      deletedAt: null,
    })
    prismaMock.billingPlan.findFirst.mockResolvedValueOnce(null)
    prismaMock.billingPlan.update.mockResolvedValueOnce({})
    getBillingPlanDetailMock.mockResolvedValueOnce({ id: 'plan_1' })

    await updateBillingPlan(
      'plan_1',
      {
        monthlyPrice: 597,
      },
      'user-1',
    )

    expect(prismaMock.billingPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan_1' },
        data: expect.objectContaining({
          syncStatus: 'pending',
          syncError: null,
          syncedAt: null,
        }),
      }),
    )
  })

  it('archives a billing plan with soft delete semantics', async () => {
    prismaMock.billingPlan.findUnique.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'WhaTrack Base',
      slug: 'platform_base',
      deletedAt: null,
      isActive: true,
    })
    prismaMock.billingPlan.update.mockResolvedValueOnce({})

    const result = await archiveBillingPlan('plan_1', 'user-1')

    expect(prismaMock.billingPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan_1' },
      data: {
        isActive: false,
        deletedAt: expect.any(Date),
      },
    })
    expect(result).toEqual({ success: true })
  })
})
