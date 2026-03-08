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
    expect(BILLING_PLAN_TYPES).toEqual(['starter', 'pro', 'agency'])
    expect(SELF_SERVE_PLAN_TYPES).toEqual(['starter', 'pro'])
  })

  it('accepts known plans and rejects unsupported checkout plans', () => {
    expect(isPlanType('agency')).toBe(true)
    expect(isSelfServePlanType('starter')).toBe(true)
    expect(isSelfServePlanType('agency')).toBe(false)
    expect(isPlanType('enterprise')).toBe(false)
  })
})

describe('billing status contract', () => {
  it('defines the supported subscription lifecycle statuses', () => {
    expect(BILLING_SUBSCRIPTION_STATUSES).toEqual(['active', 'paused', 'canceled', 'past_due'])
  })

  it('accepts known statuses and rejects unknown ones', () => {
    expect(isSubscriptionStatus('active')).toBe(true)
    expect(isSubscriptionStatus('paused')).toBe(true)
    expect(isSubscriptionStatus('canceled')).toBe(true)
    expect(isSubscriptionStatus('past_due')).toBe(true)
    expect(isSubscriptionStatus('expired')).toBe(false)
  })
})
