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
    expect(BILLING_PLAN_TYPES).toEqual([
      'platform_base',
      'additional_project',
      'additional_whatsapp_number',
      'additional_meta_ad_account',
    ])
    expect(SELF_SERVE_PLAN_TYPES).toEqual(['platform_base'])
  })

  it('accepts known plans and rejects unsupported checkout plans', () => {
    expect(isPlanType('additional_project')).toBe(true)
    expect(isSelfServePlanType('platform_base')).toBe(true)
    expect(isSelfServePlanType('additional_project')).toBe(false)
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
