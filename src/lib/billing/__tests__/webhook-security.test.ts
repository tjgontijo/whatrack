import { describe, expect, it } from 'vitest'

import {
  computeAbacatePayWebhookSignature,
  verifyAbacatePayWebhookSignature,
} from '@/lib/billing/webhook-security'

describe('billing webhook security', () => {
  const secret = 'super-secret-key'
  const payload = JSON.stringify({
    id: 'evt_123',
    event: 'billing.paid',
    data: {
      billing: {
        id: 'bill_123',
      },
    },
  })

  it('computes a stable AbacatePay signature', () => {
    expect(computeAbacatePayWebhookSignature(payload, secret)).toBe(
      '+kbW33yrO+M/B5a+uG7Mb3RD7HzMO1WcAXRtM2MkJyU='
    )
  })

  it('accepts a valid signature', () => {
    const signature = computeAbacatePayWebhookSignature(payload, secret)

    expect(verifyAbacatePayWebhookSignature(payload, signature, secret)).toBe(true)
  })

  it('rejects a missing or invalid signature', () => {
    const signature = computeAbacatePayWebhookSignature(payload, secret)

    expect(verifyAbacatePayWebhookSignature(payload, null, secret)).toBe(false)
    expect(verifyAbacatePayWebhookSignature(payload, `${signature}tampered`, secret)).toBe(false)
  })
})
