import { prisma } from '@/lib/db/prisma'

export type BillingCatalogPlanCode = 'monthly' | 'annual'
export type BillingCatalogPaymentMethod = 'CREDIT_CARD' | 'PIX' | 'PIX_AUTOMATIC'

export interface BillingCatalogOffer {
  id: string
  code: string
  paymentMethod: BillingCatalogPaymentMethod
  amount: number
  currency: string
  maxInstallments: number
  installmentRate?: number | null
}

export interface BillingCatalogPlan {
  id: string
  code: BillingCatalogPlanCode
  slug: string
  name: string
  cycle: 'MONTHLY' | 'YEARLY'
  accessDays: number
  offers: BillingCatalogOffer[]
}

function assertPlanCode(value: string): BillingCatalogPlanCode {
  if (value !== 'monthly' && value !== 'annual') {
    throw new Error(`Unsupported billing plan code: ${value}`)
  }

  return value
}

function assertPaymentMethod(value: string): BillingCatalogPaymentMethod {
  if (value === 'CREDIT_CARD' || value === 'PIX' || value === 'PIX_AUTOMATIC') {
    return value
  }

  throw new Error(`Unsupported payment method: ${value}`)
}

export class BillingCatalogService {
  static async listPlans(): Promise<BillingCatalogPlan[]> {
    const now = new Date()
    const plans = await prisma.billingPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        code: { in: ['monthly', 'annual'] },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        offers: {
          where: {
            isActive: true,
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return plans.map((plan: (typeof plans)[number]) => ({
      id: plan.id,
      code: assertPlanCode(plan.code ?? plan.slug),
      slug: plan.slug,
      name: plan.name,
      cycle: plan.cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      accessDays: plan.accessDays,
      offers: plan.offers.map((offer: (typeof plan.offers)[number]) => ({
        id: offer.id,
        code: offer.code,
        paymentMethod: assertPaymentMethod(offer.paymentMethod),
        amount: Number(offer.amount),
        currency: offer.currency,
        maxInstallments: offer.maxInstallments,
        installmentRate: offer.installmentRate == null ? null : Number(offer.installmentRate),
      })),
    }))
  }

  static async getPlan(code: BillingCatalogPlanCode) {
    const plans = await this.listPlans()
    const plan = plans.find((item) => item.code === code)

    if (!plan) {
      throw new Error(`Billing plan not found for code ${code}`)
    }

    return plan
  }
}
