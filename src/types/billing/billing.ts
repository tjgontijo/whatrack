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
export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'past_due'

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
