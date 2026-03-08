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

  it('creates a billing plan and writes audit log', async () => {
    prismaMock.billingPlan.findFirst.mockResolvedValueOnce(null)
    prismaMock.billingPlan.create.mockResolvedValueOnce({
      id: 'plan_1',
      name: 'Starter',
      slug: 'starter',
      monthlyPrice: { toString: () => '97.00' },
      currency: 'BRL',
      eventLimitPerMonth: 200,
      overagePricePerEvent: { toString: () => '0.25' },
      metadata: {},
    })
    getBillingPlanDetailMock.mockResolvedValueOnce({ id: 'plan_1' })

    const result = await createBillingPlan(
      {
        name: 'Starter',
        slug: 'starter',
        description: 'Plano inicial',
        subtitle: 'Até 200 eventos / mês',
        cta: 'Testar grátis por 7 dias',
        monthlyPrice: 97,
        currency: 'BRL',
        eventLimitPerMonth: 200,
        overagePricePerEvent: 0.25,
        maxWhatsAppNumbers: 1,
        maxAdAccounts: 1,
        maxTeamMembers: 2,
        supportLevel: 'email',
        displayOrder: 0,
        isHighlighted: false,
        contactSalesOnly: false,
        isActive: true,
        trialDays: 7,
        features: ['200 eventos/mês'],
        additionals: ['R$ 0,25 por evento extra'],
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
      displayOrder: 0,
      isActive: true,
      isHighlighted: false,
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
        monthlyPrice: 197,
        trialDays: 7,
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
      name: 'Starter',
      slug: 'starter',
      deletedAt: null,
      isActive: true,
    })
    prismaMock.billingPlan.update.mockResolvedValueOnce({})
    getBillingPlanDetailMock.mockResolvedValueOnce({ id: 'plan_1', isActive: false })

    const result = await archiveBillingPlan('plan_1', 'user-1')

    expect(prismaMock.billingPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan_1' },
      data: {
        isActive: false,
        deletedAt: expect.any(Date),
      },
    })
    expect(result).toEqual({ id: 'plan_1', isActive: false })
  })
})
