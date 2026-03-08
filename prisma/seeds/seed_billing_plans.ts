import { Prisma, PrismaClient } from '@db/client'

export async function seedBillingPlans(prisma: PrismaClient) {
  console.log('🛳️  Seeding billing plans...')

  const plans = [
    {
      slug: 'starter',
      name: 'Starter',
      description: 'Para começar a rastrear suas vendas com clareza.',
      eventLimitPerMonth: 200,
      overagePricePerEvent: new Prisma.Decimal('0.25'),
      monthlyPrice: new Prisma.Decimal('97.00'),
      maxWhatsAppNumbers: 1,
      maxAdAccounts: 1,
      maxTeamMembers: 2,
      supportLevel: 'email',
      isHighlighted: false,
      contactSalesOnly: false,
      displayOrder: 0,
      metadata: {
        subtitle: 'Até 200 eventos / mês',
        cta: 'Testar grátis por 7 dias',
        trialDays: 7,
        features: [
          '200 eventos/mês',
          '1 número de WhatsApp',
          '1 conta Meta Ads',
          '2 membros na equipe',
          'Suporte por e-mail',
        ],
        additionals: ['R$ 0,25 por evento extra'],
      },
    },
    {
      slug: 'pro',
      name: 'Pro',
      description: 'Para agências e operações em escala.',
      eventLimitPerMonth: 500,
      overagePricePerEvent: new Prisma.Decimal('0.18'),
      monthlyPrice: new Prisma.Decimal('197.00'),
      maxWhatsAppNumbers: 2,
      maxAdAccounts: 2,
      maxTeamMembers: 5,
      supportLevel: 'priority',
      isHighlighted: true,
      contactSalesOnly: false,
      displayOrder: 1,
      metadata: {
        subtitle: 'Até 500 eventos / mês',
        cta: 'Testar grátis por 7 dias',
        trialDays: 7,
        features: [
          '500 eventos/mês',
          '2 números de WhatsApp',
          '2 contas Meta Ads',
          '5 membros na equipe',
          'Suporte prioritário',
        ],
        additionals: ['R$ 0,18 por evento extra'],
      },
    },
    {
      slug: 'agency',
      name: 'Agency',
      description: 'Para agências e operações complexas.',
      eventLimitPerMonth: 10000,
      overagePricePerEvent: new Prisma.Decimal('0.12'),
      monthlyPrice: new Prisma.Decimal('0.00'), // Sob consulta
      maxWhatsAppNumbers: 10,
      maxAdAccounts: 10,
      maxTeamMembers: 999,
      supportLevel: 'dedicated',
      isHighlighted: false,
      contactSalesOnly: true,
      displayOrder: 2,
      metadata: {
        subtitle: 'Fluxo comercial sob consulta',
        cta: 'Falar com vendas',
        trialDays: 0,
        features: [
          'Operação assistida',
          'Múltiplos números de WhatsApp',
          'Contas Meta Ads personalizadas',
          'Suporte dedicado',
        ],
        additionals: [],
      },
    },
  ]

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })

    await prisma.billingPlanTemplate.upsert({
      where: { slug: plan.slug },
      update: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        eventLimitPerMonth: plan.eventLimitPerMonth,
        overagePricePerEvent: plan.overagePricePerEvent,
        monthlyPrice: plan.monthlyPrice,
        maxWhatsAppNumbers: plan.maxWhatsAppNumbers,
        maxAdAccounts: plan.maxAdAccounts,
        maxTeamMembers: plan.maxTeamMembers,
        supportLevel: plan.supportLevel,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        eventLimitPerMonth: plan.eventLimitPerMonth,
        overagePricePerEvent: plan.overagePricePerEvent,
        monthlyPrice: plan.monthlyPrice,
        maxWhatsAppNumbers: plan.maxWhatsAppNumbers,
        maxAdAccounts: plan.maxAdAccounts,
        maxTeamMembers: plan.maxTeamMembers,
        supportLevel: plan.supportLevel,
      },
    })
  }

  console.log('✅ Billing plans seeded successfully!')
}
