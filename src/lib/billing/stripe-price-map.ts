import { isPlanType, type PlanType } from '@/types/billing/billing'

function getStripePriceMap(): Record<PlanType, string | undefined> {
  return {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    agency: process.env.STRIPE_PRICE_AGENCY,
  }
}

export function getStripePriceIdForPlan(planType: string): string | null {
  if (!isPlanType(planType)) {
    return null
  }

  return getStripePriceMap()[planType] ?? null
}

export function getPlanTypeFromStripePriceId(
  priceId: string | null | undefined,
): PlanType | null {
  if (!priceId) {
    return null
  }

  const match = Object.entries(getStripePriceMap()).find(
    ([, mappedPriceId]) => mappedPriceId === priceId,
  )

  return match ? (match[0] as PlanType) : null
}
