export const BILLING_PLAN_TYPES = [
  'platform_base',
  'additional_project',
  'additional_whatsapp_number',
  'additional_meta_ad_account',
] as const

export type PlanType = (typeof BILLING_PLAN_TYPES)[number]

export const SELF_SERVE_PLAN_TYPES = ['platform_base'] as const

export type SelfServePlanType = (typeof SELF_SERVE_PLAN_TYPES)[number]

export function isPlanType(value: string): value is PlanType {
  return BILLING_PLAN_TYPES.includes(value as PlanType)
}

export function isSelfServePlanType(value: string): value is SelfServePlanType {
  return SELF_SERVE_PLAN_TYPES.includes(value as SelfServePlanType)
}

export const BILLING_SUBSCRIPTION_STATUSES = ['active', 'paused', 'canceled', 'past_due'] as const

export type SubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number]

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return BILLING_SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
}

export type PaymentMethod = 'card'
