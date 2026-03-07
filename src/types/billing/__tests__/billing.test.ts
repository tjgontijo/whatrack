import { describe, expect, it } from 'vitest'

import {
  BILLING_SUBSCRIPTION_STATUSES,
  isSubscriptionStatus,
} from '@/types/billing/billing'

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
