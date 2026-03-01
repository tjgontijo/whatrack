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
    },
  ]

  for (const plan of plans) {
    await prisma.billingPlanTemplate.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }

  console.log('✅ Billing plans seeded successfully!')
}
