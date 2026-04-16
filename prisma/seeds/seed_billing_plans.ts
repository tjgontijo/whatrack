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
    includedConversionsPerProject: 999999,
    supportLevel: 'standard',
    displayOrder: 0,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      slug: 'starter',
      monthlyPrice: '97.00',
      cta: 'Começar agora',
      subtitle: 'Para operações com 1 projeto ativo.',
      features: [
        '1 projeto',
        '1 instância WhatsApp por projeto',
        '1 conta Meta Ads por projeto',
        'Disparador de campanhas no WhatsApp',
        'Dashboard completo de rastreamento',
        'CRM Kanban de leads',
        'Suporte na plataforma',
      ],
      additionals: ['Projeto adicional por R$ 97/mês'],
    },
  },
  {
    code: 'pro_monthly',
    name: 'Pro',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 3,
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 999999,
    supportLevel: 'priority',
    displayOrder: 1,
    isHighlighted: true,
    contactSalesOnly: false,
    metadata: {
      slug: 'pro',
      monthlyPrice: '197.00',
      cta: 'Começar agora',
      subtitle: 'Para operações com até 3 projetos ativos.',
      features: [
        '3 projetos',
        '1 instância WhatsApp por projeto',
        '1 conta Meta Ads por projeto',
        'Disparador de campanhas no WhatsApp',
        'Dashboard completo de rastreamento',
        'CRM Kanban de leads',
        'Suporte prioritário',
      ],
      additionals: ['Projeto adicional por R$ 67/mês'],
    },
  },
  {
    code: 'business_monthly',
    name: 'Business',
    cycle: 'MONTHLY',
    accessDays: 30,
    includedProjects: 10,
    includedWhatsAppPerProject: 1,
    includedMetaAdAccountsPerProject: 1,
    includedConversionsPerProject: 999999,
    supportLevel: 'priority',
    displayOrder: 2,
    isHighlighted: false,
    contactSalesOnly: false,
    metadata: {
      slug: 'business',
      monthlyPrice: '397.00',
      cta: 'Começar agora',
      subtitle: 'Para operações com até 10 projetos ativos.',
      features: [
        '10 projetos',
        '10 instâncias WhatsApp',
        '10 contas Meta Ads',
        'Disparador de campanhas no WhatsApp',
        'Dashboard completo de rastreamento',
        'CRM Kanban avançado',
        'Suporte prioritário',
      ],
      additionals: ['Projeto adicional por R$ 47/mês'],
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
