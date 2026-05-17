export const BILLING_PLAN_TYPES = [
  'starter_monthly',
  'pro_monthly',
  'business_monthly',
] as const

export type PlanType = (typeof BILLING_PLAN_TYPES)[number]

export const SELF_SERVE_PLAN_TYPES = ['starter_monthly', 'pro_monthly', 'business_monthly'] as const

export type SelfServePlanType = (typeof SELF_SERVE_PLAN_TYPES)[number]

export function isPlanType(value: string): value is PlanType {
  return BILLING_PLAN_TYPES.includes(value as PlanType)
}

export function isSelfServePlanType(value: string): value is SelfServePlanType {
  return SELF_SERVE_PLAN_TYPES.includes(value as SelfServePlanType)
}

export const BILLING_SUBSCRIPTION_STATUSES = [
  'INACTIVE',
  'PENDING',
  'ACTIVE',
  'OVERDUE',
  'CANCELED',
  'EXPIRED',
  'FAILED',
] as const

export type SubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number]

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return BILLING_SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
}

export const BILLING_PAYMENT_METHODS = ['CREDIT_CARD', 'PIX', 'PIX_AUTOMATIC'] as const

export type PaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number]

export function isPaymentMethod(value: string): value is PaymentMethod {
  return BILLING_PAYMENT_METHODS.includes(value as PaymentMethod)
}
