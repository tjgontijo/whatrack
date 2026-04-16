import { Prisma, PrismaClient } from '@generated/prisma/client'

export async function seedBillingOffers(prisma: PrismaClient) {
  console.log('💳 Seeding billing offers...')

  const planCodes = [
    'starter_monthly',
    'growth_monthly',
    'agency_monthly',
    'pro_monthly',
    'enterprise_monthly',
  ]

  const planPrices: Record<string, { monthly: string; annual: string }> = {
    starter_monthly: { monthly: '197.00', annual: '1997.00' },
    growth_monthly: { monthly: '497.00', annual: '4997.00' },
    agency_monthly: { monthly: '697.00', annual: '6997.00' },
    pro_monthly: { monthly: '997.00', annual: '9997.00' },
    enterprise_monthly: { monthly: 'custom', annual: 'custom' },
  }

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
      amount: new Prisma.Decimal('197.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'starter_monthly_pix_automatic',
      planId: planMap.get('starter_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('197.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'starter_annual_credit_card',
      planId: planMap.get('starter_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('1997.00'),
      currency: 'BRL',
      maxInstallments: 12,
      installmentRate: new Prisma.Decimal('0.0349'),
    },
    {
      code: 'starter_annual_pix',
      planId: planMap.get('starter_monthly')!,
      paymentMethod: 'PIX',
      amount: new Prisma.Decimal('1997.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    // Growth monthly
    {
      code: 'growth_monthly_credit_card',
      planId: planMap.get('growth_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('497.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'growth_monthly_pix_automatic',
      planId: planMap.get('growth_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('497.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'growth_annual_credit_card',
      planId: planMap.get('growth_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('4997.00'),
      currency: 'BRL',
      maxInstallments: 12,
      installmentRate: new Prisma.Decimal('0.0349'),
    },
    {
      code: 'growth_annual_pix',
      planId: planMap.get('growth_monthly')!,
      paymentMethod: 'PIX',
      amount: new Prisma.Decimal('4997.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    // Agency monthly
    {
      code: 'agency_monthly_credit_card',
      planId: planMap.get('agency_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('697.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'agency_monthly_pix_automatic',
      planId: planMap.get('agency_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('697.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'agency_annual_credit_card',
      planId: planMap.get('agency_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('6997.00'),
      currency: 'BRL',
      maxInstallments: 12,
      installmentRate: new Prisma.Decimal('0.0349'),
    },
    {
      code: 'agency_annual_pix',
      planId: planMap.get('agency_monthly')!,
      paymentMethod: 'PIX',
      amount: new Prisma.Decimal('6997.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    // Pro monthly
    {
      code: 'pro_monthly_credit_card',
      planId: planMap.get('pro_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('997.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'pro_monthly_pix_automatic',
      planId: planMap.get('pro_monthly')!,
      paymentMethod: 'PIX_AUTOMATIC',
      amount: new Prisma.Decimal('997.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    {
      code: 'pro_annual_credit_card',
      planId: planMap.get('pro_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('9997.00'),
      currency: 'BRL',
      maxInstallments: 12,
      installmentRate: new Prisma.Decimal('0.0349'),
    },
    {
      code: 'pro_annual_pix',
      planId: planMap.get('pro_monthly')!,
      paymentMethod: 'PIX',
      amount: new Prisma.Decimal('9997.00'),
      currency: 'BRL',
      maxInstallments: 1,
      installmentRate: null,
    },
    // Enterprise - contact sales only
    {
      code: 'enterprise_monthly_contact_sales',
      planId: planMap.get('enterprise_monthly')!,
      paymentMethod: 'CREDIT_CARD',
      amount: new Prisma.Decimal('0.00'),
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
