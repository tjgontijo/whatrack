/**
 * AbacatePay Payment Provider (v1 API - Direct REST)
 *
 * FLOW:
 * 1. POST /api/v1/billing/checkout → creates customer + billing via API v1
 * 2. API returns checkout URL in response
 * 3. User clicks URL and pays on AbacatePay
 * 4. Webhook fires: billing.paid event
 * 5. DB subscription created via webhook handler
 */

import type {
  CheckoutSession,
  PaymentMethod,
  PaymentProvider,
  SubscriptionDetails,
  SubscriptionStatus,
} from './payment-provider'
import { logger } from '@/lib/utils/logger'

const API_BASE = 'https://api.abacatepay.com/v1'

export class AbacatepayProvider implements PaymentProvider {
  private secretKey: string

  constructor(secretKey: string) {
    this.secretKey = secretKey
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
    userEmail?: string
    userName?: string
    userPhone?: string
    userTaxId?: string
    isPerson?: boolean
  }): Promise<CheckoutSession> {
    try {
      const { planType, organizationId, successUrl, returnUrl } = params

      // Get plan details
      const planConfig = this.getPlanConfig(planType)

      // Step 1: Get or create customer
      const customerId = await this.getOrCreateCustomer(
        organizationId,
        {
          email: params.userEmail,
          name: params.userName,
          phone: params.userPhone,
          taxId: params.userTaxId,
          isPerson: params.isPerson,
        }
      )

      logger.info(
        { customerId, organizationId },
        '[AbacatePay] Customer ready'
      )

      // Step 2: Create billing via API v1
      const billingResponse = await this.apiFetch('/billing/create', {
        method: 'POST',
        body: {
          frequency: 'ONE_TIME',
          methods: ['PIX', 'CARD'],
          products: [
            {
              externalId: `org-${organizationId}`,
              name: planConfig.name,
              description: planConfig.description,
              quantity: 1,
              price: planConfig.monthlyPrice, // centavos
            },
          ],
          returnUrl,
          completionUrl: successUrl,
          customerId,
        },
      })

      if (!billingResponse.data || Array.isArray(billingResponse.data)) {
        logger.error(
          { response: billingResponse },
          '[AbacatePay] Billing creation failed'
        )
        throw new Error(
          `Failed to create billing: ${billingResponse.error || JSON.stringify(billingResponse)}`
        )
      }

      const billingData = billingResponse.data as Record<string, unknown>
      const billingId = billingData.id as string
      const checkoutUrl = billingData.url as string

      if (!billingId || !checkoutUrl) {
        throw new Error(
          `Invalid billing response: missing id or url`
        )
      }

      logger.info(
        { id: billingId, url: checkoutUrl },
        '[AbacatePay] Checkout URL created'
      )

      return {
        id: billingId,
        url: checkoutUrl,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        method: 'card',
      }
    } catch (error) {
      logger.error(
        { err: error, stack: error instanceof Error ? error.stack : undefined },
        '[AbacatePay] Checkout creation error'
      )
      throw new Error(
        `AbacatePay checkout creation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      // Fetch billing by ID using the v1 API
      const response = await this.apiFetch(
        `/billing/get?id=${encodeURIComponent(subscriptionId)}`,
        {
          method: 'GET',
        }
      )

      if (!response.data) {
        throw new Error(`Failed to fetch billing: ${response.error}`)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const billing = response.data as any

      // Calculate billing period
      const currentPeriodStart = new Date(billing.createdAt)
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      return {
        id: billing.id,
        customerId: billing.customer?.id || '',
        status: this.mapStatus(billing.status),
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
    _subscriptionId: string,
    _atPeriodEnd: boolean
  ): Promise<void> {
    try {
      // AbacatePay v1 API doesn't have a cancel endpoint yet
      logger.warn(
        `Subscription cancellation not available in AbacatePay v1 API: ${_subscriptionId}`
      )
    } catch (error) {
      throw new Error(
        `AbacatePay cancel subscription failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async updateSubscriptionPlan(
    _subscriptionId: string,
    _newPlanType: string
  ): Promise<void> {
    try {
      // AbacatePay v1 API doesn't have a plan update endpoint yet
      logger.warn(
        `Subscription plan update not available in AbacatePay v1 API: ${_subscriptionId} -> ${_newPlanType}`
      )
    } catch (error) {
      throw new Error(
        `AbacatePay plan update failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Get or create a customer in AbacatePay
   * Uses real user data from the authenticated session
   */
  private async getOrCreateCustomer(
    organizationId: string,
    userData?: {
      email?: string
      name?: string
      phone?: string
      taxId?: string
      isPerson?: boolean
    }
  ): Promise<string> {
    try {
      // Validate required user data
      if (!userData?.name) {
        throw new Error('User name is required for customer creation')
      }
      if (!userData?.email) {
        throw new Error('User email is required for customer creation')
      }
      if (!userData?.phone) {
        throw new Error('User phone is required for customer creation')
      }

      // TODO: Add taxId field to User model schema
      // For now, generate a placeholder CNPJ (will need user to provide real CPF/CNPJ)
      const taxId = '12.345.678/0001-90'

      const response = await this.apiFetch('/customer/create', {
        method: 'POST',
        body: {
          name: userData.name,
          cellphone: userData.phone,
          email: userData.email,
          taxId,
        },
      })

      if (!response.data || !(response.data as Record<string, unknown>).id) {
        throw new Error(
          `Failed to create customer: ${response.error || JSON.stringify(response)}`
        )
      }

      const customerId = (response.data as Record<string, unknown>).id as string

      logger.info(
        { customerId, organizationId },
        '[AbacatePay] Customer created'
      )

      return customerId
    } catch (error) {
      logger.error(
        { err: error, organizationId },
        '[AbacatePay] Customer creation error'
      )
      throw new Error(
        `Failed to get/create customer: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Make authenticated API call to AbacatePay v1 API
   */
  private async apiFetch(
    endpoint: string,
    options: {
      method: 'GET' | 'POST'
      body?: Record<string, unknown>
    }
  ): Promise<{
    data?: Record<string, unknown> | Array<unknown>
    error?: string
  }> {
    const url = `${API_BASE}${endpoint}`
    const headers = new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.secretKey}`,
    })

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error(
        { status: response.status, endpoint, error: data },
        '[AbacatePay] API error'
      )
    }

    return data
  }

  /**
   * Map AbacatePay billing status to internal status
   */
  private mapStatus(status: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      PENDING: 'paused',
      PAID: 'active',
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
