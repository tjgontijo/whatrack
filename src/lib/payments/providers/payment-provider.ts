/**
 * Payment Provider Interface
 *
 * Agnóstic interface for payment providers (Polar, AbacatePay, Stripe, etc).
 * Each provider implements this interface to handle:
 * - Subscription creation
 * - Checkout sessions
 * - Subscription management (cancel, update)
 */

export type PaymentMethod = 'card' | 'pix' | 'boleto'

export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'past_due'

export interface CheckoutSession {
  /**
   * Unique ID for this checkout session (provider-specific)
   */
  id: string

  /**
   * URL where the user completes payment
   */
  url: string

  /**
   * When this checkout link expires
   */
  expiresAt: Date

  /**
   * Primary payment method for this checkout
   */
  method: PaymentMethod
}

export interface SubscriptionDetails {
  /**
   * Subscription ID from the provider
   */
  id: string

  /**
   * Customer ID from the provider (for API calls)
   */
  customerId: string

  /**
   * Current status
   */
  status: SubscriptionStatus

  /**
   * Start of current billing period
   */
  currentPeriodStart: Date

  /**
   * End of current billing period
   */
  currentPeriodEnd: Date

  /**
   * Provider identifier
   */
  provider: string
}

export interface WebhookPayload {
  /**
   * Event type (e.g., 'order.paid', 'subscription.updated')
   */
  type: string

  /**
   * Event-specific data
   */
  data: Record<string, unknown>

  /**
   * When the event occurred
   */
  timestamp: Date

  /**
   * Optional event ID for deduplication
   */
  eventId?: string
}

export interface PaymentProvider {
  /**
   * Returns the provider identifier
   */
  getProviderId(): string

  /**
   * Check if provider is properly configured with valid credentials
   */
  isConfigured(): boolean

  /**
   * Create a checkout session for a subscription
   */
  createCheckoutSession(params: {
    organizationId: string
    planType: string
    paymentMethod?: PaymentMethod
    successUrl: string
    returnUrl: string
  }): Promise<CheckoutSession>

  /**
   * Fetch subscription details from provider
   */
  getSubscription(subscriptionId: string): Promise<SubscriptionDetails>

  /**
   * Cancel a subscription
   *
   * @param subscriptionId Provider's subscription ID
   * @param atPeriodEnd If true, cancel at end of billing period instead of immediately
   */
  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void>

  /**
   * Update subscription plan (typically used for upgrades/downgrades)
   */
  updateSubscriptionPlan(subscriptionId: string, newPlanType: string): Promise<void>
}
