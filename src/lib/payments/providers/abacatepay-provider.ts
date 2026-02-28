/**
 * AbacatePay Payment Provider
 *
 * Implementation of PaymentProvider interface for AbacatePay API (v2).
 * Handles subscription creation, management, and payment processing.
 */

import { AbacatePay } from '@abacatepay/sdk'
import { env } from '@/lib/env/env'
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
      const { organizationId, planType, successUrl, returnUrl } = params

      // Get plan details from environment
      const planConfig = this.getPlanConfig(planType)

      // For AbacatePay, we need to:
      // 1. Create or fetch customer (using organizationId as externalId)
      // 2. Create subscription
      // Note: AbacatePay doesn't return a checkout URL for subscriptions,
      // so we'll use the subscription ID as the checkout session

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = await this.client.subscriptions.create({
        amount: planConfig.monthlyPrice,
        name: planConfig.name,
        description: planConfig.description,
        externalId: organizationId,
        method: 'card',
        frequency: {
          cycle: 'MONTHLY',
          dayOfProcessing: 1,
        },
        customerId: organizationId, // In real scenario, would create customer first
        retryPolicy: {
          maxRetry: 3,
          retryEvery: 3,
        },
      } as any)

      if (!subscription.success || !subscription.data) {
        throw new Error(`Failed to create subscription: ${subscription.error}`)
      }

      return {
        id: subscription.data.id,
        url: `https://abacatepay.com/subscription/${subscription.data.id}`, // Placeholder URL
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
      const currentPeriodStart = new Date(sub.updatedAt)
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
    atPeriodEnd: boolean
  ): Promise<void> {
    try {
      // AbacatePay SDK v2 doesn't expose a cancel method directly
      // We would need to call the REST API directly
      // For now, this is a placeholder that would require implementation
      // with axios or fetch to PATCH /v2/subscriptions/{id}

      // TODO: Implement actual cancellation via REST API
      console.warn(
        `Subscription cancellation not fully implemented for AbacatePay yet: ${subscriptionId}`
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
      // Similar to cancel, SDK v2 doesn't expose this directly
      // Would need REST API call to PATCH /v2/subscriptions/{id} with new amount

      // TODO: Implement actual plan update via REST API
      console.warn(
        `Subscription plan update not fully implemented for AbacatePay yet: ${subscriptionId} -> ${newPlanType}`
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
   * Get plan configuration from environment
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
