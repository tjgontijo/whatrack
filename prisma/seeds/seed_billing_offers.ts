import { Prisma, PrismaClient } from '@generated/prisma/client'

export async function seedBillingOffers(prisma: PrismaClient) {
  console.log('💳 Seeding billing offers...')

  const planCodes = [
    'starter_monthly',
    'pro_monthly',
    'business_monthly',
  ]

  const plans = await Promise.all(
    planCodes.map((code) =>
      prisma.billingPlan.findUnique({
        where: { code },
        select: { id: true, code: true },
      })
    )
  )

  const planMap = new Map(plans.map((p) => [p?.code, p?.id]).filter(([, id]) => !!id))

  if (planMap.size !== planCodes.length) {
    throw new Error(`Billing plans must exist before seeding offers. Found: ${planMap.size}/${planCodes.length}`)
  }

  const offers = [
    // Starter monthly
    {
      code: 'starter_monthly_credit_card',
      planId: planMap.get('starter_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('97.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'starter_monthly_pix_automatic',
      planId: planMap.get('starter_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('97.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    // Pro monthly
    {
      code: 'pro_monthly_credit_card',
      planId: planMap.get('pro_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('197.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'pro_monthly_pix_automatic',
      planId: planMap.get('pro_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('197.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    // Business monthly
    {
      code: 'business_monthly_credit_card',
      planId: planMap.get('business_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('397.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'business_monthly_pix_automatic',
      planId: planMap.get('business_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('397.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
  ]

  for (const offer of offers) {
    await prisma.billingOffer.upsert({
      where: { code: offer.code },
      update: offer,
      create: offer,
    })
  }

  console.log('✅ Billing offers seeded successfully!')
}
