import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getPlanTypeFromStripePriceId,
  getStripePriceIdForPlan,
} from '@/lib/billing/stripe-price-map'

describe('stripe-price-map', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_PRICE_STARTER = 'price_starter_test'
    process.env.STRIPE_PRICE_PRO = 'price_pro_test'
    process.env.STRIPE_PRICE_AGENCY = 'price_agency_test'
  })

  it('returns the configured stripe price id for a plan', () => {
    expect(getStripePriceIdForPlan('starter')).toBe('price_starter_test')
    expect(getStripePriceIdForPlan('pro')).toBe('price_pro_test')
  })

  it('returns null for an unknown plan type', () => {
    expect(getStripePriceIdForPlan('enterprise')).toBeNull()
  })

  it('resolves the internal plan type from a stripe price id', () => {
    expect(getPlanTypeFromStripePriceId('price_starter_test')).toBe('starter')
    expect(getPlanTypeFromStripePriceId('price_pro_test')).toBe('pro')
  })

  it('returns null when the stripe price id is not mapped', () => {
    expect(getPlanTypeFromStripePriceId('price_unknown')).toBeNull()
    expect(getPlanTypeFromStripePriceId(null)).toBeNull()
  })
})
