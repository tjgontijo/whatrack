import { describe, expect, it } from 'vitest'

import { BILLING_STATUS_LABELS, getBillingStatusLabel } from '@/lib/billing/subscription-status'

describe('subscription-status', () => {
  it('maps paused subscriptions to the pending confirmation label', () => {
    expect(getBillingStatusLabel('paused')).toBe('Aguardando confirmação')
    expect(BILLING_STATUS_LABELS.paused).toBe('Aguardando confirmação')
  })
})
