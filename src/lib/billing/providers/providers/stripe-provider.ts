/**
 * Stripe Payment Provider
 *
 * Implements subscription management via Stripe Checkout Sessions and Customer Portal.
 * Handles checkout creation, subscription tracking, cancellation, and plan updates.
 */

import type {
  CheckoutSession,
  PaymentMethod,
  PaymentProvider,
  SubscriptionDetails,
  SubscriptionStatus,
} from './billing-provider'
import { getBillingPlan } from '@/lib/billing/plans'
import { getStripePriceIdForPlan } from '@/lib/billing/stripe-price-map'
import { logger } from '@/lib/utils/logger'
import Stripe from 'stripe'

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
  }): Promise<CheckoutSession> {
    try {
      const { organizationId, planType, successUrl, userEmail } = params

      // Get plan details
      const planConfig = getBillingPlan(planType)
      if (!planConfig) {
        throw new Error(`Unknown plan type: ${planType}`)
      }

      // Get Stripe price ID from environment
      const priceId = getStripePriceIdForPlan(planType)
      if (!priceId) {
        throw new Error(
          `Stripe price ID not configured for plan: ${planType}`
        )
      }

      // Create checkout session for subscription
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: userEmail,
        success_url: successUrl,
        cancel_url: params.returnUrl,
        metadata: {
          organizationId,
          planType,
        },
        subscription_data: {
          metadata: {
            organizationId,
            planType,
          },
        },
        allow_promotion_codes: true,
      })

      if (!session.url) {
        throw new Error('Failed to generate checkout URL from Stripe')
      }

      logger.info(
        { sessionId: session.id, organizationId, planType },
        '[Stripe] Checkout session created'
      )

      return {
        id: session.id,
        customerId: session.customer?.toString(),
        url: session.url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        method: 'card',
      }
    } catch (error) {
      logger.error(
        { err: error, stack: error instanceof Error ? error.stack : undefined },
        '[Stripe] Checkout creation error'
      )
      throw new Error(
        `Stripe checkout creation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = (await this.stripe.subscriptions.retrieve(
        subscriptionId
      )) as any

      const customerId = subscription.customer
      if (typeof customerId !== 'string') {
        throw new Error('Invalid customer ID in subscription')
      }

      return {
        id: subscription.id,
        customerId,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date((subscription.current_period_start as number) * 1000),
        currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000),
        provider: 'stripe',
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      }
    } catch (error) {
      logger.error(
        { err: error, subscriptionId },
        '[Stripe] Get subscription error'
      )
      throw new Error(
        `Stripe get subscription failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    atPeriodEnd: boolean
  ): Promise<void> {
    try {
      if (atPeriodEnd) {
        // Cancel at the end of the billing period
        await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        })
        logger.info(
          { subscriptionId },
          '[Stripe] Subscription marked for cancellation at period end'
        )
      } else {
        // Cancel immediately
        await this.stripe.subscriptions.cancel(subscriptionId)
        logger.info(
          { subscriptionId },
          '[Stripe] Subscription canceled immediately'
        )
      }
    } catch (error) {
      logger.error(
        { err: error, subscriptionId },
        '[Stripe] Cancel subscription error'
      )
      throw new Error(
        `Stripe cancel subscription failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async updateSubscriptionPlan(
    subscriptionId: string,
    newPlanType: string
  ): Promise<void> {
    try {
      const priceId = getStripePriceIdForPlan(newPlanType)
      if (!priceId) {
        throw new Error(
          `Stripe price ID not configured for plan: ${newPlanType}`
        )
      }

      // Get current subscription to find the subscription item
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId
      )

      if (!subscription.items.data || subscription.items.data.length === 0) {
        throw new Error('No subscription items found')
      }

      // Update the first subscription item with the new price
      await this.stripe.subscriptions.update(subscriptionId, {
        metadata: {
          planType: newPlanType,
        },
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: 'create_prorations',
      })

      logger.info(
        { subscriptionId, newPlanType },
        '[Stripe] Subscription plan updated'
      )
    } catch (error) {
      logger.error(
        { err: error, subscriptionId, newPlanType },
        '[Stripe] Update subscription plan error'
      )
      throw new Error(
        `Stripe update plan failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Create a portal session for the customer to manage their subscription
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      })

      logger.info(
        { customerId, sessionId: session.id },
        '[Stripe] Portal session created'
      )

      return session.url
    } catch (error) {
      logger.error(
        { err: error, customerId },
        '[Stripe] Portal session creation error'
      )
      throw new Error(
        `Stripe portal session creation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Map Stripe subscription status to internal status
   */
  private mapStripeStatus(status: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      active: 'active',
      past_due: 'past_due',
      unpaid: 'past_due',
      canceled: 'canceled',
      incomplete: 'paused',
      incomplete_expired: 'canceled',
      trialing: 'active',
    }
    return map[status] ?? 'past_due'
  }
}
