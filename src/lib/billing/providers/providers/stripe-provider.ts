import type {
  CheckoutSession,
  PaymentMethod,
  PaymentProvider,
  SubscriptionDetails,
  SubscriptionStatus,
} from './billing-provider'
import {
  buildBillingPlanPresentation,
  requireCheckoutReadyBillingPlan,
} from '@/services/billing/billing-plan-catalog.service'
import { logger } from '@/lib/utils/logger'
import Stripe from 'stripe'

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    default:
      return 'paused'
  }
}

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey)
  }

  getProviderId(): string {
    return 'stripe'
  }

  isConfigured(): boolean {
    return !!this.stripe
  }

  async createCheckoutSession(params: {
    organizationId: string
    planType: string
    paymentMethod?: PaymentMethod
    successUrl: string
    returnUrl: string
    userEmail?: string
    userName?: string
    userPhone?: string
    userTaxId?: string
    isPerson?: boolean
    skipTrial?: boolean
  }): Promise<CheckoutSession> {
    const plan = await requireCheckoutReadyBillingPlan(params.planType)
    const presentation = buildBillingPlanPresentation(plan)

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId!,
          quantity: 1,
        },
      ],
      customer_email: params.userEmail,
      success_url: params.successUrl,
      cancel_url: params.returnUrl,
      metadata: {
        organizationId: params.organizationId,
        planType: params.planType,
      },
      subscription_data: {
        metadata: {
          organizationId: params.organizationId,
          planType: params.planType,
        },
        ...(!params.skipTrial && presentation.trialDays > 0
          ? {
              trial_period_days: presentation.trialDays,
            }
          : {}),
      },
      allow_promotion_codes: true,
    })

    if (!session.url) {
      throw new Error('Failed to generate checkout URL from Stripe')
    }

    logger.info(
      { sessionId: session.id, organizationId: params.organizationId, planType: params.planType },
      '[Stripe] Checkout session created'
    )

    return {
      id: session.id,
      customerId: session.customer?.toString(),
      url: session.url,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      method: 'card',
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
    const rawSubscription = subscription as Stripe.Subscription & {
      current_period_start?: number
      current_period_end?: number
      trial_end?: number | null
      cancel_at_period_end?: boolean
    }
    const customerId = subscription.customer

    if (typeof customerId !== 'string') {
      throw new Error('Invalid customer ID in subscription')
    }

    const periodStartUnix =
      typeof rawSubscription.current_period_start === 'number'
        ? rawSubscription.current_period_start
        : subscription.items.data[0]?.current_period_start
    const periodEndUnix =
      typeof rawSubscription.current_period_end === 'number'
        ? rawSubscription.current_period_end
        : subscription.items.data[0]?.current_period_end

    return {
      id: subscription.id,
      customerId,
      status: mapStripeStatus(subscription.status),
      currentPeriodStart: new Date((periodStartUnix ?? Math.floor(Date.now() / 1000)) * 1000),
      currentPeriodEnd: new Date((periodEndUnix ?? Math.floor(Date.now() / 1000)) * 1000),
      provider: 'stripe',
      cancelAtPeriodEnd: Boolean(rawSubscription.cancel_at_period_end),
      items: subscription.items.data.map((item) => ({
        stripeSubscriptionItemId: item.id,
        priceId: item.price.id ?? null,
        quantity: item.quantity ?? 0,
      })),
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
      return
    }

    await this.stripe.subscriptions.cancel(subscriptionId)
  }

  async updateSubscriptionPlan(subscriptionId: string, newPlanType: string): Promise<void> {
    const plan = await requireCheckoutReadyBillingPlan(newPlanType)
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)

    const baseItem = subscription.items.data[0]
    if (!baseItem) {
      throw new Error('No subscription items found')
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      metadata: {
        planType: newPlanType,
      },
      items: [
        {
          id: baseItem.id,
          price: plan.stripePriceId!,
          quantity: 1,
        },
      ],
      proration_behavior: 'create_prorations',
    })
  }

  async syncSubscriptionItems(params: {
    subscriptionId: string
    items: Array<{
      planId: string
      stripePriceId: string
      quantity: number
    }>
  }) {
    const subscription = await this.stripe.subscriptions.retrieve(params.subscriptionId)
    const existingByPriceId = new Map(
      subscription.items.data
        .map((item) => [item.price.id, item] as const)
        .filter(([priceId]) => Boolean(priceId)),
    )
    const handledPriceIds = new Set<string>()
    const output: Array<{
      planId: string
      stripeSubscriptionItemId: string | null
      quantity: number
    }> = []

    for (const item of params.items) {
      handledPriceIds.add(item.stripePriceId)
      const existing = existingByPriceId.get(item.stripePriceId)

      if (item.quantity <= 0) {
        if (existing) {
          await this.stripe.subscriptionItems.del(existing.id)
        }

        output.push({
          planId: item.planId,
          stripeSubscriptionItemId: null,
          quantity: 0,
        })
        continue
      }

      if (existing) {
        const updated =
          existing.quantity === item.quantity
            ? existing
            : await this.stripe.subscriptionItems.update(existing.id, {
                quantity: item.quantity,
                proration_behavior: 'create_prorations',
              })

        output.push({
          planId: item.planId,
          stripeSubscriptionItemId: updated.id,
          quantity: updated.quantity ?? item.quantity,
        })
        continue
      }

      const created = await this.stripe.subscriptionItems.create({
        subscription: params.subscriptionId,
        price: item.stripePriceId,
        quantity: item.quantity,
        proration_behavior: 'create_prorations',
      })

      output.push({
        planId: item.planId,
        stripeSubscriptionItemId: created.id,
        quantity: created.quantity ?? item.quantity,
      })
    }

    for (const existing of subscription.items.data) {
      if (!existing.price.id || handledPriceIds.has(existing.price.id)) continue
      // leave unmanaged items untouched
    }

    return output
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session.url
  }
}
