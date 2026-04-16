import { Prisma, PrismaClient } from '@generated/prisma/client'

export async function seedBillingOffers(prisma: PrismaClient) {
  console.log('💳 Seeding billing offers...')

  const monthlyPlan = await prisma.billingPlan.findUnique({
    where: { slug: 'monthly' },
    select: { id: true },
  })

  const annualPlan = await prisma.billingPlan.findUnique({
    where: { slug: 'annual' },
    select: { id: true },
  })

  if (!monthlyPlan || !annualPlan) {
    throw new Error('Billing plans monthly/annual must exist before seeding offers')
  }

  const offers = [
    {
      code: 'monthly_credit_card',
      planId: monthlyPlan.id,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('497.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'monthly_pix_automatic',
      planId: monthlyPlan.id,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('497.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'annual_credit_card',
      planId: annualPlan.id,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('4788.00'),
      currency: 'BRL',
      maxInstallments: 12,
      installmentRate: new Prisma.Decimal('0.0349'),
    },
    {
      code: 'annual_pix',
      planId: annualPlan.id,
      paymentMethod: 'PIX',
      amount: new Prisma.Decimal('4788.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
  ] as const

  for (const offer of offers) {
    await prisma.billingOffer.upsert({
      where: { code: offer.code },
      update: offer,
      create: offer,
    })
  }

  console.log('✅ Billing offers seeded successfully!')
}
