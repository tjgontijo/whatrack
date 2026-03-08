/**
 * Billing Domain Types
 *
 * Pure TypeScript types that don't require Zod validation.
 * For validated types, see src/schemas/billing/billing-schemas.ts
 */

/**
 * Plan types available
 */
export const BILLING_PLAN_TYPES = ['starter', 'pro', 'agency'] as const

export type PlanType = (typeof BILLING_PLAN_TYPES)[number]

export const SELF_SERVE_PLAN_TYPES = ['starter', 'pro'] as const

export type SelfServePlanType = (typeof SELF_SERVE_PLAN_TYPES)[number]

export function isPlanType(value: string): value is PlanType {
  return BILLING_PLAN_TYPES.includes(value as PlanType)
}

export function isSelfServePlanType(value: string): value is SelfServePlanType {
  return SELF_SERVE_PLAN_TYPES.includes(value as SelfServePlanType)
}

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
