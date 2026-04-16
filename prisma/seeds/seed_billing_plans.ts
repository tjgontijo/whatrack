import { Prisma, PrismaClient } from '@generated/prisma/client'

const plans = [
  {
    code: 'starter_monthly',
    name: 'Starter',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 1,
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 300,
    supportLevel: 'standard',
    displayOrder: 0,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      monthlyPrice: '197.00',
      annualPrice: '1997.00',
      annualDiscount: '15%',
      features: [
        '1 cliente ativo',
        '1 número de WhatsApp por cliente',
        '1 conta Meta Ads por cliente',
        '300 conversões rastreadas por cliente / mês',
        'Suporte padrão',
      ],
    },
  },
  {
    code: 'growth_monthly',
    name: 'Growth',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 3,
    includedWhatsAppPerProject: 3,
    includedMetaAdAccountsPerProject: 3,
    includedConversionsPerProject: 1000,
    supportLevel: 'priority',
    displayOrder: 1,
    isHighlighted: true,
    contactSalesOnly: false,
    metadata: {
      monthlyPrice: '497.00',
      annualPrice: '4997.00',
      annualDiscount: '15%',
      features: [
        'Até 3 clientes ativos',
        '3 números de WhatsApp por cliente',
        '3 contas Meta Ads por cliente',
        '1.000 conversões rastreadas por cliente / mês',
        'Suporte prioritário',
      ],
    },
  },
  {
    code: 'agency_monthly',
    name: 'Agency',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 5,
    includedWhatsAppPerProject: 5,
    includedMetaAdAccountsPerProject: 5,
    includedConversionsPerProject: 2500,
    supportLevel: 'priority',
    displayOrder: 2,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      monthlyPrice: '697.00',
      annualPrice: '6997.00',
      annualDiscount: '15%',
      features: [
        'Até 5 clientes ativos',
        '5 números de WhatsApp por cliente',
        '5 contas Meta Ads por cliente',
        '2.500 conversões rastreadas por cliente / mês',
        'Suporte prioritário',
      ],
    },
  },
  {
    code: 'pro_monthly',
    name: 'Pro',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 10,
    includedWhatsAppPerProject: 10,
    includedMetaAdAccountsPerProject: 10,
    includedConversionsPerProject: 5000,
    supportLevel: 'priority',
    displayOrder: 3,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      monthlyPrice: '997.00',
      annualPrice: '9997.00',
      annualDiscount: '15%',
      features: [
        'Até 10 clientes ativos',
        '10 números de WhatsApp por cliente',
        '10 contas Meta Ads por cliente',
        '5.000 conversões rastreadas por cliente / mês',
        'Suporte prioritário',
      ],
    },
  },
  {
    code: 'enterprise_monthly',
    name: 'Enterprise',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 999,
    includedWhatsAppPerProject: 999,
    includedMetaAdAccountsPerProject: 999,
    includedConversionsPerProject: 999999,
    supportLevel: 'enterprise',
    displayOrder: 4,
    isHighlighted: false,
    contactSalesOnly: true,
    metadata: {
      monthlyPrice: 'Customizado',
      annualPrice: 'Customizado',
      annualDiscount: '15%',
      features: [
        'Clientes ilimitados',
        'WhatsApp ilimitado por cliente',
        'Meta Ads ilimitado por cliente',
        'Conversões ilimitadas',
        'Suporte dedicado enterprise',
        'SLA garantido',
      ],
    },
  },
] as const

export async function seedBillingPlans(prisma: PrismaClient) {
  console.log('🛳️  Seeding billing plans...')

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    })
  }

  console.log('✅ Billing plans seeded successfully!')
}
