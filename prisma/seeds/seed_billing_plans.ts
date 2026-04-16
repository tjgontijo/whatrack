import { Prisma, PrismaClient } from '@generated/prisma/client'

const plans = [
  {
    slug: 'monthly',
    code: 'monthly',
    name: 'WhaTrack Mensal',
    description: 'Plano mensal com checkout transparente e renovação principal por cartão.',
    cycle: 'MONTHLY',
    accessDays: 30,
    kind: 'base',
    addonType: null,
    monthlyPrice: new Prisma.Decimal('497.00'),
    currency: 'BRL',
    includedProjects: 3,
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 300,
    supportLevel: 'priority',
    isHighlighted: true,
    contactSalesOnly: false,
    displayOrder: 0,
    syncStatus: 'pending',
    metadata: {
      subtitle: 'Cobrança recorrente com cartão como principal',
      cta: 'Assinar mensal',
      trialDays: 0,
      features: [
        'Até 3 clientes ativos',
        '1 número de WhatsApp por cliente',
        '1 conta Meta Ads por cliente',
        '300 conversões rastreadas por cliente / mês',
        'Cartão de crédito como opção principal',
        'PIX Automático como opção secundária',
      ],
      additionals: [],
    },
  },
  {
    slug: 'annual',
    code: 'annual',
    name: 'WhaTrack Anual',
    description: 'Plano anual com cartão como principal e PIX manual como opção adicional.',
    cycle: 'YEARLY',
    accessDays: 365,
    kind: 'base',
    addonType: null,
    monthlyPrice: new Prisma.Decimal('4788.00'),
    currency: 'BRL',
    includedProjects: 3,
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 300,
    supportLevel: 'priority',
    isHighlighted: false,
    contactSalesOnly: false,
    displayOrder: 1,
    syncStatus: 'pending',
    metadata: {
      subtitle: 'Pagamento anual com cartão ou PIX',
      cta: 'Assinar anual',
      trialDays: 0,
      features: [
        'Até 3 clientes ativos',
        '1 número de WhatsApp por cliente',
        '1 conta Meta Ads por cliente',
        '300 conversões rastreadas por cliente / mês',
        'Cartão de crédito como opção principal',
        'PIX manual como opção secundária',
      ],
      additionals: [],
    },
  },
] as const

export async function seedBillingPlans(prisma: PrismaClient) {
  console.log('🛳️  Seeding billing plans...')

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }

  console.log('✅ Billing plans seeded successfully!')
}
