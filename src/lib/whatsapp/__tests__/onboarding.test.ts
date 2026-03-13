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
      'https://business.facebook.com/messaging/whatsapp/onboard/?app_id=app-id&config_id=config-id&state=track-123',
      'track-123'
    )

    const parsed = new URL(url)

    expect(parsed.origin).toBe('https://business.facebook.com')
    expect(parsed.pathname).toBe('/messaging/whatsapp/onboard/')
    expect(parsed.searchParams.getAll('state')).toEqual(['track-123'])
    expect(parsed.searchParams.get('extras')).toContain('"featureType":"whatsapp_business_app_onboarding"')
    expect(parsed.searchParams.get('extras')).toContain('"trackingCode":"track-123"')
  })
})
