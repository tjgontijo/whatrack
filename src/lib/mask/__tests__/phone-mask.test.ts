import { describe, expect, it } from 'vitest'

import { WHATSAPP_MASK_MAX_LENGTH, applyWhatsAppMask, normalizeWhatsApp } from '../phone-mask'

describe('phone mask helpers', () => {
  it('formats brazilian mobile numbers with the ninth digit', () => {
    const formatted = applyWhatsAppMask('11988888888')

    expect(formatted).toBe('(11) 98888-8888')
    expect(formatted).toHaveLength(WHATSAPP_MASK_MAX_LENGTH)
  })

  it('normalizes brazilian mobile numbers preserving the ninth digit', () => {
    expect(normalizeWhatsApp('(11) 98888-8888')).toBe('5511988888888')
  })
})
