import { describe, expect, it } from 'vitest'

import {
  BILLING_PLAN_TYPES,
  BILLING_SUBSCRIPTION_STATUSES,
  SELF_SERVE_PLAN_TYPES,
  isPlanType,
  isSelfServePlanType,
  isSubscriptionStatus,
} from '@/types/billing/billing'

describe('billing type contract', () => {
  it('defines the supported plan catalogs for launch', () => {
    expect(BILLING_PLAN_TYPES).toEqual(['starter_monthly', 'pro_monthly', 'business_monthly'])
    expect(SELF_SERVE_PLAN_TYPES).toEqual(['starter_monthly', 'pro_monthly', 'business_monthly'])
  })

  it('accepts known plans and rejects unsupported checkout plans', () => {
    expect(isPlanType('starter_monthly')).toBe(true)
    expect(isSelfServePlanType('business_monthly')).toBe(true)
    expect(isSelfServePlanType('enterprise')).toBe(false)
    expect(isPlanType('enterprise')).toBe(false)
  })
})

describe('billing status contract', () => {
  it('defines the supported subscription lifecycle statuses', () => {
    expect(BILLING_SUBSCRIPTION_STATUSES).toEqual([
      'INACTIVE',
      'PENDING',
      'ACTIVE',
      'OVERDUE',
      'CANCELED',
      'EXPIRED',
      'FAILED',
    ])
  })

  it('accepts known statuses and rejects unknown ones', () => {
    expect(isSubscriptionStatus('ACTIVE')).toBe(true)
    expect(isSubscriptionStatus('PENDING')).toBe(true)
    expect(isSubscriptionStatus('CANCELED')).toBe(true)
    expect(isSubscriptionStatus('OVERDUE')).toBe(true)
    expect(isSubscriptionStatus('INACTIVE')).toBe(true)
    expect(isSubscriptionStatus('active')).toBe(false)
    expect(isSubscriptionStatus('expired')).toBe(false)
  })
})
