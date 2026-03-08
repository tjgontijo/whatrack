import { describe, expect, it } from 'vitest'

import { BILLING_PLANS, getBillingPlan } from '@/lib/billing/plans'

describe('billing plans catalog', () => {
  it('exposes the launch pricing and limits from a single shared source', () => {
    expect(BILLING_PLANS.starter.eventLimitPerMonth).toBe(200)
    expect(BILLING_PLANS.pro.monthlyPriceInCents).toBe(19700)
    expect(BILLING_PLANS.agency.contactSalesOnly).toBe(true)
  })

  it('keeps launch plan copy free of AI promises', () => {
    const allFeatures = Object.values(BILLING_PLANS).flatMap((plan) => plan.features)

    expect(allFeatures.some((feature) => /ia/i.test(feature))).toBe(false)
  })

  it('returns null for unknown plans', () => {
    expect(getBillingPlan('enterprise')).toBeNull()
  })
})
