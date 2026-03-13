import { Prisma, PrismaClient } from '@generated/prisma/client'

export async function seedBillingPlans(prisma: PrismaClient) {
  console.log('🛳️  Seeding billing plans...')

  const plans = [
    {
      slug: 'platform_base',
      name: 'WhaTrack',
      description: 'Plataforma para agências provarem atribuição real de Meta Ads até o WhatsApp.',
      kind: 'base',
      addonType: null,
      monthlyPrice: new Prisma.Decimal('497.00'),
      currency: 'BRL',
      includedProjects: 3,
      includedWhatsAppPerProject: 1,
      includedMetaAdAccountsPerProject: 1,
      includedConversionsPerProject: 300,
      includedAiCreditsPerProject: 10000,
      supportLevel: 'priority',
      isHighlighted: true,
      contactSalesOnly: false,
      displayOrder: 0,
      metadata: {
        subtitle: 'Até 3 clientes ativos incluídos',
        cta: 'Teste grátis por 14 dias',
        trialDays: 14,
        features: [
          'Até 3 clientes ativos',
          '1 número de WhatsApp por cliente',
          '1 conta Meta Ads por cliente',
          '300 conversões rastreadas por cliente / mês',
          '10.000 créditos de IA por cliente / mês',
          'Suporte prioritário',
        ],
        additionals: [
          'R$ 97 por cliente adicional',
          'R$ 49 por WhatsApp adicional no mesmo cliente',
          'R$ 49 por conta Meta Ads adicional no mesmo cliente',
        ],
      },
    },
    {
      slug: 'additional_project',
      name: 'Projeto adicional',
      description: 'Adiciona um novo cliente ativo com franquia operacional completa.',
      kind: 'addon',
      addonType: 'project',
      monthlyPrice: new Prisma.Decimal('97.00'),
      currency: 'BRL',
      includedProjects: 1,
      includedWhatsAppPerProject: 1,
      includedMetaAdAccountsPerProject: 1,
      includedConversionsPerProject: 300,
      includedAiCreditsPerProject: 10000,
      supportLevel: 'priority',
      isHighlighted: false,
      contactSalesOnly: false,
      displayOrder: 1,
      metadata: {
        subtitle: 'Cliente ativo extra',
        cta: 'Adicionado automaticamente conforme uso',
        trialDays: 0,
        features: [
          '1 cliente ativo adicional',
          '1 número de WhatsApp incluído',
          '1 conta Meta Ads incluída',
          '300 conversões rastreadas / mês',
          '10.000 créditos de IA / mês',
        ],
        additionals: [],
      },
    },
    {
      slug: 'additional_whatsapp_number',
      name: 'WhatsApp adicional',
      description: 'Adiciona um número extra dentro do mesmo projeto.',
      kind: 'addon',
      addonType: 'whatsapp_number',
      monthlyPrice: new Prisma.Decimal('49.00'),
      currency: 'BRL',
      includedProjects: 0,
      includedWhatsAppPerProject: 0,
      includedMetaAdAccountsPerProject: 0,
      includedConversionsPerProject: 0,
      includedAiCreditsPerProject: 0,
      supportLevel: 'priority',
      isHighlighted: false,
      contactSalesOnly: false,
      displayOrder: 2,
      metadata: {
        subtitle: 'Número extra no mesmo cliente',
        cta: 'Adicionado automaticamente conforme uso',
        trialDays: 0,
        features: [
          '1 número adicional de WhatsApp',
          'Compartilha conversões e créditos do projeto',
        ],
        additionals: [],
      },
    },
    {
      slug: 'additional_meta_ad_account',
      name: 'Conta Meta Ads adicional',
      description: 'Adiciona uma conta Meta Ads extra dentro do mesmo projeto.',
      kind: 'addon',
      addonType: 'meta_ad_account',
      monthlyPrice: new Prisma.Decimal('49.00'),
      currency: 'BRL',
      includedProjects: 0,
      includedWhatsAppPerProject: 0,
      includedMetaAdAccountsPerProject: 0,
      includedConversionsPerProject: 0,
      includedAiCreditsPerProject: 0,
      supportLevel: 'priority',
      isHighlighted: false,
      contactSalesOnly: false,
      displayOrder: 3,
      metadata: {
        subtitle: 'Conta extra no mesmo cliente',
        cta: 'Adicionado automaticamente conforme uso',
        trialDays: 0,
        features: [
          '1 conta Meta Ads adicional',
          'Compartilha conversões e créditos do projeto',
        ],
        additionals: [],
      },
    },
  ] as const

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }

  console.log('✅ Billing plans seeded successfully!')
}
