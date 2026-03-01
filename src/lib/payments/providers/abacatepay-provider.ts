/**
 * AbacatePay Payment Provider (v2 SDK)
 *
 * FLOW:
 * 1. POST /api/v1/billing/checkout → creates subscription via SDK
 * 2. SDK returns checkout URL automatically
 * 3. User clicks URL and pays on AbacatePay
 * 4. Webhook fires: subscription status changes to ACTIVE
 * 5. DB subscription created via webhook handler
 */

import { AbacatePay } from '@abacatepay/sdk'
import type {
  CheckoutSession,
  PaymentMethod,
  PaymentProvider,
  SubscriptionDetails,
  SubscriptionStatus,
} from './payment-provider'

export class AbacatepayProvider implements PaymentProvider {
  private client: ReturnType<typeof AbacatePay>
  private secretKey: string

  constructor(secretKey: string) {
    this.secretKey = secretKey
    this.client = AbacatePay({ secret: secretKey })
  }

  getProviderId(): string {
    return 'abacatepay'
  }

  isConfigured(): boolean {
    return !!this.secretKey && this.secretKey.length > 0
  }

  async createCheckoutSession(params: {
    organizationId: string
    planType: string
    paymentMethod?: PaymentMethod
    successUrl: string
    returnUrl: string
  }): Promise<CheckoutSession> {
    try {
      const { organizationId, planType } = params

      // Get plan details
      const planConfig = this.getPlanConfig(planType)

      // Create subscription with SDK v2
      // This automatically generates a checkout URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('[AbacatePay] Creating subscription with config:', {
        amount: planConfig.monthlyPrice,
        name: planConfig.name,
        externalId: `org-${organizationId}`,
      })

      const subscription = await this.client.subscriptions.create({
        amount: planConfig.monthlyPrice,
        name: planConfig.name,
        description: planConfig.description,
        externalId: `org-${organizationId}`,
        method: 'card',
        frequency: {
          cycle: 'MONTHLY',
          dayOfProcessing: 1,
        },
        customerId: organizationId,
        retryPolicy: {
          maxRetry: 3,
          retryEvery: 3,
        },
      } as any)

      console.log('[AbacatePay] SDK Response:', JSON.stringify(subscription, null, 2))

      if (!subscription.success || !subscription.data) {
        throw new Error(`Failed to create subscription: ${subscription.error}`)
      }

      // SDK v2 provides the checkout URL
      const checkoutUrl = `https://checkout.abacatepay.com/${subscription.data.id}`
      console.log('[AbacatePay] Generated Checkout URL:', checkoutUrl)

      return {
        id: subscription.data.id,
        url: checkoutUrl,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        method: 'card',
      }
    } catch (error) {
      throw new Error(
        `AbacatePay checkout creation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      const response = await this.client.subscriptions.list()

      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch subscription: ${response.error}`)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = response.data.find((s: any) => s.id === subscriptionId)

      if (!sub) {
        throw new Error(`Subscription ${subscriptionId} not found`)
      }

      // Calculate billing period
      const currentPeriodStart = new Date(sub.createdAt)
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      return {
        id: sub.id,
        customerId: sub.customerId,
        status: this.mapStatus(sub.status),
        currentPeriodStart,
        currentPeriodEnd,
        provider: 'abacatepay',
      }
    } catch (error) {
      throw new Error(
        `AbacatePay get subscription failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    _atPeriodEnd: boolean
  ): Promise<void> {
    try {
      // TODO: Use REST client to cancel: PATCH /v2/subscriptions/{id}
      console.warn(
        `Subscription cancellation needs REST API implementation: ${subscriptionId}`
      )
    } catch (error) {
      throw new Error(
        `AbacatePay cancel subscription failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async updateSubscriptionPlan(
    subscriptionId: string,
    newPlanType: string
  ): Promise<void> {
    try {
      // TODO: Use REST client to update: PATCH /v2/subscriptions/{id}
      console.warn(
        `Subscription plan update needs REST API implementation: ${subscriptionId} -> ${newPlanType}`
      )
    } catch (error) {
      throw new Error(
        `AbacatePay plan update failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Map AbacatePay subscription status to internal status
   */
  private mapStatus(status: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      ACTIVE: 'active',
      PENDING: 'paused',
      CANCELLED: 'canceled',
      FAILED: 'past_due',
      EXPIRED: 'canceled',
    }
    return map[status] ?? 'past_due'
  }

  /**
   * Get plan configuration
   */
  private getPlanConfig(planType: string): {
    name: string
    description: string
    monthlyPrice: number
  } {
    switch (planType) {
      case 'starter':
        return {
          name: 'WhaTrack Starter',
          description: 'Para começar a rastrear suas vendas com clareza',
          monthlyPrice: 9700, // R$ 97.00 em centavos
        }
      case 'pro':
        return {
          name: 'WhaTrack Pro',
          description: 'Para agências e operações em escala',
          monthlyPrice: 19700, // R$ 197.00 em centavos
        }
      case 'agency':
        return {
          name: 'WhaTrack Agency',
          description: 'Para agências e operações complexas',
          monthlyPrice: 0, // Sob consulta
        }
      default:
        throw new Error(`Unknown plan type: ${planType}`)
    }
  }
}
