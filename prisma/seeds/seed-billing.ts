import type { PrismaClient, BillingProvider, PlanInterval } from '@prisma/client'

/**
 * Billing Plans Configuration
 *
 * Based on PRD billing structure:
 * - Free: R$0 (limited features)
 * - Starter: R$97/month, R$970/year (2 months free)
 * - Pro: R$197/month, R$1970/year (2 months free)
 * - Business: R$397/month, R$3970/year (2 months free)
 */

interface PlanPriceConfig {
  provider: BillingProvider
  currency: string
  interval: PlanInterval
  amountCents: number
}

interface PlanConfig {
  name: string
  slug: string
  description: string
  sortOrder: number
  maxMetaProfiles: number
  maxMetaAdAccounts: number
  maxWhatsappInstances: number
  maxMembers: number
  maxLeadsPerMonth: number | null
  maxMessagesPerMonth: number | null
  messageRetentionDays: number | null
  maxMessagesStored: number | null
  aiCreditsQuota: number
  prices: PlanPriceConfig[]
}

export const BILLING_PLANS: PlanConfig[] = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Plano gratuito para testar a plataforma',
    sortOrder: 0,
    maxMetaProfiles: 0,
    maxMetaAdAccounts: 0,
    maxWhatsappInstances: 1,
    maxMembers: 1,
    maxLeadsPerMonth: 50,
    maxMessagesPerMonth: 100,
    messageRetentionDays: 7,
    maxMessagesStored: 500,
    aiCreditsQuota: 0, // Free plan has no AI credits
    prices: [], // Free plan has no prices
  },
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Para pequenos negócios começando no digital',
    sortOrder: 1,
    maxMetaProfiles: 1,
    maxMetaAdAccounts: 1,
    maxWhatsappInstances: 1,
    maxMembers: 2,
    maxLeadsPerMonth: 500,
    maxMessagesPerMonth: 1000,
    messageRetentionDays: 30,
    maxMessagesStored: 5000,
    aiCreditsQuota: 100, // 100 AI credits per billing cycle
    prices: [
      {
        provider: 'asaas' as BillingProvider,
        currency: 'BRL',
        interval: 'monthly' as PlanInterval,
        amountCents: 9700, // R$97.00
      },
      {
        provider: 'asaas' as BillingProvider,
        currency: 'BRL',
        interval: 'yearly' as PlanInterval,
        amountCents: 97000, // R$970.00 (2 months free)
      },
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'Para negócios em crescimento',
    sortOrder: 2,
    maxMetaProfiles: 3,
    maxMetaAdAccounts: 3,
    maxWhatsappInstances: 3,
    maxMembers: 5,
    maxLeadsPerMonth: 2000,
    maxMessagesPerMonth: 5000,
    messageRetentionDays: 90,
    maxMessagesStored: 20000,
    aiCreditsQuota: 500, // 500 AI credits per billing cycle
    prices: [
      {
        provider: 'asaas' as BillingProvider,
        currency: 'BRL',
        interval: 'monthly' as PlanInterval,
        amountCents: 19700, // R$197.00
      },
      {
        provider: 'asaas' as BillingProvider,
        currency: 'BRL',
        interval: 'yearly' as PlanInterval,
        amountCents: 197000, // R$1970.00 (2 months free)
      },
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Para operações de grande escala',
    sortOrder: 3,
    maxMetaProfiles: 10,
    maxMetaAdAccounts: 10,
    maxWhatsappInstances: 10,
    maxMembers: 20,
    maxLeadsPerMonth: null, // Unlimited
    maxMessagesPerMonth: null, // Unlimited
    messageRetentionDays: 365,
    maxMessagesStored: null, // Unlimited
    aiCreditsQuota: 1500, // 1500 AI credits per billing cycle
    prices: [
      {
        provider: 'asaas' as BillingProvider,
        currency: 'BRL',
        interval: 'monthly' as PlanInterval,
        amountCents: 39700, // R$397.00
      },
      {
        provider: 'asaas' as BillingProvider,
        currency: 'BRL',
        interval: 'yearly' as PlanInterval,
        amountCents: 397000, // R$3970.00 (2 months free)
      },
    ],
  },
]

/**
 * Seed billing plans and prices
 */
export async function seedBillingPlans(prisma: PrismaClient): Promise<void> {
  console.log('💰 Criando planos de billing...')

  for (const planConfig of BILLING_PLANS) {
    const { prices, ...planData } = planConfig

    // Upsert plan
    const plan = await prisma.plan.upsert({
      where: { slug: planData.slug },
      update: planData,
      create: planData,
    })

    console.log(`  ✓ Plano ${plan.name} criado/atualizado`)

    // Create prices for the plan
    for (const priceConfig of prices) {
      await prisma.planPrice.upsert({
        where: {
          planId_provider_currency_interval: {
            planId: plan.id,
            provider: priceConfig.provider,
            currency: priceConfig.currency,
            interval: priceConfig.interval,
          },
        },
        update: {
          amountCents: priceConfig.amountCents,
          isActive: true,
        },
        create: {
          planId: plan.id,
          provider: priceConfig.provider,
          currency: priceConfig.currency,
          interval: priceConfig.interval,
          amountCents: priceConfig.amountCents,
          isActive: true,
        },
      })
    }

    if (prices.length > 0) {
      console.log(`    → ${prices.length} preços configurados`)
    }
  }

  console.log('✅ Planos de billing criados com sucesso!')
}

