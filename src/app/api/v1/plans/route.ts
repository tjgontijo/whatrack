import { NextResponse } from 'next/server'

import { PlanService } from '@/services/billing'
import { listPlansSchema } from '../billing/schemas'

/**
 * GET /api/v1/plans
 *
 * List active plans with their prices.
 * This is a public endpoint - no authentication required.
 */
export async function GET(request: Request) {
  try {
    // Parse optional query params
    const searchParams = new URL(request.url).searchParams
    const parsed = listPlansSchema.safeParse({
      currency: searchParams.get('currency') ?? undefined,
      interval: searchParams.get('interval') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query params', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { currency, interval } = parsed.data

    const planService = new PlanService()
    const plans = await planService.listActivePlans()

    // Filter prices by currency and interval if specified
    const plansWithFilteredPrices = plans.map((plan) => {
      let filteredPrices = plan.prices.filter((price) => price.isActive)

      if (currency) {
        filteredPrices = filteredPrices.filter((price) => price.currency === currency)
      }

      if (interval) {
        filteredPrices = filteredPrices.filter((price) => price.interval === interval)
      }

      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        sortOrder: plan.sortOrder,
        // Plan limits
        limits: {
          maxMetaProfiles: plan.maxMetaProfiles,
          maxMetaAdAccounts: plan.maxMetaAdAccounts,
          maxWhatsappInstances: plan.maxWhatsappInstances,
          maxMembers: plan.maxMembers,
          maxLeadsPerMonth: plan.maxLeadsPerMonth,
          maxMessagesPerMonth: plan.maxMessagesPerMonth,
          messageRetentionDays: plan.messageRetentionDays,
          maxMessagesStored: plan.maxMessagesStored,
        },
        prices: filteredPrices.map((price) => ({
          id: price.id,
          provider: price.provider,
          currency: price.currency,
          interval: price.interval,
          amountCents: price.amountCents,
        })),
      }
    })

    return NextResponse.json({ data: plansWithFilteredPrices })
  } catch (error) {
    console.error('[api/plans] GET error', error)
    return NextResponse.json(
      { error: 'Failed to list plans' },
      { status: 500 }
    )
  }
}
