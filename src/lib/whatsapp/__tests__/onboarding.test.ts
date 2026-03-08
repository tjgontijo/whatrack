import { describe, expect, it } from 'vitest'

import {
  buildWhatsAppEmbeddedSignupUrl,
  isWhatsAppEmbeddedSignupConfigured,
} from '@/lib/whatsapp/onboarding'

describe('whatsapp onboarding helpers', () => {
  it('detects when embedded signup is configured', () => {
    expect(isWhatsAppEmbeddedSignupConfigured('app-id', 'config-id')).toBe(true)
    expect(isWhatsAppEmbeddedSignupConfigured('app-id', '')).toBe(false)
  })

  it('adds extras without duplicating the state param', () => {
    const url = buildWhatsAppEmbeddedSignupUrl(
      'https://www.facebook.com/dialog/oauth?client_id=app-id&state=track-123',
      'track-123'
    )

    const parsed = new URL(url)

    expect(parsed.searchParams.getAll('state')).toEqual(['track-123'])
    expect(parsed.searchParams.get('extras')).toContain('"trackingCode":"track-123"')
  })
})
