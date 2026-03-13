import { describe, expect, it } from 'vitest'

import {
  billingPlanBaseSchema,
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
      kind: 'all',
    })
  })

  it('rejects oversized page sizes', () => {
    const parsed = billingPlanListQuerySchema.safeParse({ pageSize: 1000 })

    expect(parsed.success).toBe(false)
  })

  it('validates a paginated billing plan response for the new base model', () => {
    const parsed = billingPlanListResponseSchema.safeParse({
      items: [
        {
          id: 'plan_1',
          name: 'WhaTrack Base',
          slug: 'platform_base',
          description: 'Plano base para agencias',
          kind: 'base',
          addonType: null,
          subtitle: 'Até 3 clientes ativos incluídos',
          cta: 'Teste grátis por 14 dias',
          trialDays: 14,
          features: ['3 clientes ativos incluídos'],
          additionals: ['Projeto adicional por R$ 97/mês'],
          monthlyPrice: '497.00',
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
          syncedAt: '2026-03-08T12:00:00.000Z',
          isActive: true,
          isHighlighted: true,
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

  it('validates create payloads for add-on plans', () => {
    const parsed = billingPlanCreateSchema.safeParse({
      name: 'Projeto adicional',
      slug: 'additional_project',
      description: 'Cliente extra com franquia completa',
      kind: 'addon',
      addonType: 'project',
      monthlyPrice: 97,
      currency: 'BRL',
      includedProjects: 0,
      includedWhatsAppPerProject: 0,
      includedMetaAdAccountsPerProject: 0,
      includedConversionsPerProject: 0,
      includedAiCreditsPerProject: 0,
      supportLevel: 'priority',
      displayOrder: 1,
      isHighlighted: false,
      contactSalesOnly: false,
      isActive: true,
      trialDays: 0,
      features: ['1 cliente ativo adicional'],
      additionals: [],
    })

    expect(parsed.success).toBe(true)
  })

  it('exposes a base schema that can be extended without relying on refined omit', () => {
    const parsed = billingPlanBaseSchema.safeParse({
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
      displayOrder: 0,
      isHighlighted: true,
      contactSalesOnly: false,
      trialDays: 14,
      features: ['3 clientes ativos incluídos'],
      additionals: ['Projeto extra por R$ 97/mês'],
    })

    expect(parsed.success).toBe(true)
  })
})
