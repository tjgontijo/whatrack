import { Prisma } from '@db/client'
import Stripe from 'stripe'

import { env } from '@/lib/env/env'
import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import { getBillingPlanDetail } from './billing-plan-query.service'

export class BillingPlanStripeSyncError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'BillingPlanStripeSyncError'
  }
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY)

function toCents(value: Prisma.Decimal) {
  return Math.round(Number(value) * 100)
}

export async function syncBillingPlanToStripe(
  planId: string,
  userId: string,
  options?: { forceNewPrice?: boolean },
) {
  const plan = await prisma.billingPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      monthlyPrice: true,
      currency: true,
      stripeProductId: true,
      stripePriceId: true,
      isActive: true,
      contactSalesOnly: true,
      syncStatus: true,
    },
  })

  if (!plan) {
    throw new BillingPlanStripeSyncError('Plano não encontrado', 404)
  }

  try {
    const product = plan.stripeProductId
      ? await stripe.products.update(plan.stripeProductId, {
          name: plan.name,
          description: plan.description ?? undefined,
          active: plan.isActive,
          metadata: {
            planId: plan.id,
            slug: plan.slug,
          },
        })
      : await stripe.products.create({
          name: plan.name,
          description: plan.description ?? undefined,
          active: plan.isActive,
          metadata: {
            planId: plan.id,
            slug: plan.slug,
          },
        })

    let nextPriceId: string | null = plan.stripePriceId

    if (plan.contactSalesOnly || Number(plan.monthlyPrice) <= 0) {
      if (plan.stripePriceId) {
        await stripe.prices.update(plan.stripePriceId, { active: false })
      }
      nextPriceId = null
    } else {
      const price = await stripe.prices.create({
        currency: plan.currency.toLowerCase(),
        unit_amount: toCents(plan.monthlyPrice),
        recurring: { interval: 'month' },
        product: product.id,
        metadata: {
          planId: plan.id,
          slug: plan.slug,
        },
      })

      if (plan.stripePriceId && plan.stripePriceId !== price.id) {
        await stripe.prices.update(plan.stripePriceId, { active: false })
      }

      nextPriceId = price.id
    }

    await prisma.billingPlan.update({
      where: { id: planId },
      data: {
        stripeProductId: product.id,
        stripePriceId: nextPriceId,
        syncStatus: 'synced',
        syncError: null,
        syncedAt: new Date(),
      },
    })

    await auditService.log({
      userId,
      action: 'billing-plan.synced',
      resourceType: 'billing-plan',
      resourceId: planId,
      metadata: {
        forceNewPrice: options?.forceNewPrice ?? false,
        stripeProductId: product.id,
        stripePriceId: nextPriceId,
      },
    })

    return getBillingPlanDetail(planId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar com Stripe'

    await prisma.billingPlan.update({
      where: { id: planId },
      data: {
        syncStatus: 'error',
        syncError: message,
      },
    })

    await auditService.log({
      userId,
      action: 'billing-plan.sync_failed',
      resourceType: 'billing-plan',
      resourceId: planId,
      metadata: {
        error: message,
      },
    })

    throw new BillingPlanStripeSyncError(message, 502)
  }
}
