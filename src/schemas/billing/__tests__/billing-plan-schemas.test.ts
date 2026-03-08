import { describe, expect, it } from 'vitest'

import {
  billingPlanCreateSchema,
  billingPlanListQuerySchema,
  billingPlanListResponseSchema,
} from '@/schemas/billing/billing-plan-schemas'

describe('billing-plan-schemas', () => {
  it('applies defensive defaults to list queries', () => {
    expect(billingPlanListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
      status: 'all',
      syncStatus: 'all',
    })
  })

  it('rejects oversized page sizes', () => {
    const parsed = billingPlanListQuerySchema.safeParse({ pageSize: 1000 })

    expect(parsed.success).toBe(false)
  })

  it('validates a paginated billing plan response', () => {
    const parsed = billingPlanListResponseSchema.safeParse({
      items: [
        {
          id: 'plan_1',
          name: 'Starter',
          slug: 'starter',
          description: 'Plano inicial',
          subtitle: 'Até 200 eventos / mês',
          cta: 'Testar grátis por 7 dias',
          trialDays: 7,
          features: ['200 eventos/mês'],
          additionals: ['R$ 0,25 por evento extra'],
          monthlyPrice: '97.00',
          currency: 'BRL',
          eventLimitPerMonth: 200,
          overagePricePerEvent: '0.25',
          maxWhatsAppNumbers: 1,
          maxAdAccounts: 1,
          maxTeamMembers: 2,
          supportLevel: 'email',
          stripeProductId: 'prod_1',
          stripePriceId: 'price_1',
          syncStatus: 'synced',
          syncError: null,
          syncedAt: '2026-03-08T12:00:00.000Z',
          isActive: true,
          isHighlighted: false,
          contactSalesOnly: false,
          displayOrder: 0,
          deletedAt: null,
          createdAt: '2026-03-08T12:00:00.000Z',
          updatedAt: '2026-03-08T12:00:00.000Z',
          subscriptionCount: 4,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })

    expect(parsed.success).toBe(true)
  })

  it('validates create payloads with trial and marketing fields', () => {
    const parsed = billingPlanCreateSchema.safeParse({
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
    })

    expect(parsed.success).toBe(true)
  })
})
