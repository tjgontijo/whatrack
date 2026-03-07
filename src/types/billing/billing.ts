/**
 * Billing Domain Types
 *
 * Pure TypeScript types that don't require Zod validation.
 * For validated types, see src/schemas/billing/billing-schemas.ts
 */

/**
 * Plan types available
 */
export type PlanType = 'starter' | 'pro' | 'agency'

/**
 * Subscription status
 */
export const BILLING_SUBSCRIPTION_STATUSES = ['active', 'paused', 'canceled', 'past_due'] as const

export type SubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number]

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return BILLING_SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
}

/**
 * Event types that count towards billing metering
 */
export type EventType = 'lead_qualified' | 'purchase_confirmed'

/**
 * Parameters for recording an event
 */
export interface RecordEventParams {
  organizationId: string
  eventType: EventType
}

/**
 * Event usage summary for current cycle
 */
export interface EventUsageSummary {
  used: number
  limit: number
  overage: number
  nextResetDate: Date
}

/**
 * Payment method
 */
export type PaymentMethod = 'card' | 'pix' | 'boleto'
