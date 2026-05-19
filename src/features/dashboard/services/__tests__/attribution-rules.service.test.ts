import { describe, it, expect } from 'vitest'
import {
  attributionRulesService,
  SourceType,
} from '../attribution-rules.service'

describe('AttributionRulesService', () => {
  describe('classifyLead', () => {
    it('detects Meta paid via ctwaclid (WhatsApp)', () => {
      const result = attributionRulesService.classifyLead({
        ctwaclid: 'wa_123',
      })
      expect(result.sourceType).toBe(SourceType.META_PAID)
      expect(result.channel).toBe('whatsapp')
      expect(result.confidence).toBe(100)
    })

    it('detects Meta paid via fbclid (Facebook)', () => {
      const result = attributionRulesService.classifyLead({
        fbclid: 'fb_456',
      })
      expect(result.sourceType).toBe(SourceType.META_PAID)
      expect(result.channel).toBe('facebook')
      expect(result.confidence).toBe(100)
    })

    it('prefers ctwaclid over fbclid', () => {
      const result = attributionRulesService.classifyLead({
        ctwaclid: 'wa_123',
        fbclid: 'fb_456',
      })
      expect(result.channel).toBe('whatsapp')
    })

    it('detects TikTok via ttclid', () => {
      const result = attributionRulesService.classifyLead({
        ttclid: 'tt_789',
      })
      expect(result.sourceType).toBe(SourceType.OTHER_PAID)
      expect(result.channel).toBe('tiktok')
      expect(result.confidence).toBe(100)
    })

    it('detects Google via gclid', () => {
      const result = attributionRulesService.classifyLead({
        gclid: 'gc_000',
      })
      expect(result.sourceType).toBe(SourceType.OTHER_PAID)
      expect(result.channel).toBe('google')
      expect(result.confidence).toBe(100)
    })

    it('classifies paid via sourceType', () => {
      const result = attributionRulesService.classifyLead({
        sourceType: 'paid',
        utmMedium: 'cpc',
      })
      expect(result.sourceType).toBe(SourceType.OTHER_PAID)
      expect(result.confidence).toBe(80)
    })

    it('classifies organic via sourceType', () => {
      const result = attributionRulesService.classifyLead({
        sourceType: 'organic',
        utmSource: 'google',
      })
      expect(result.sourceType).toBe(SourceType.ORGANIC)
      expect(result.confidence).toBe(80)
    })

    it('classifies via UTM heuristics (paid medium)', () => {
      const result = attributionRulesService.classifyLead({
        utmSource: 'google_ads',
        utmMedium: 'paid_search',
      })
      expect(result.sourceType).toBe(SourceType.OTHER_PAID)
      expect(result.confidence).toBe(60)
    })

    it('classifies via UTM heuristics (organic medium)', () => {
      const result = attributionRulesService.classifyLead({
        utmSource: 'google',
        utmMedium: 'organic',
      })
      expect(result.sourceType).toBe(SourceType.ORGANIC)
      expect(result.confidence).toBe(60)
    })

    it('defaults to unknown for no signals', () => {
      const result = attributionRulesService.classifyLead({})
      expect(result.sourceType).toBe(SourceType.UNKNOWN)
      expect(result.confidence).toBe(0)
    })
  })

  describe('isMetaPaidRevenue', () => {
    it('returns true for ctwaclid only', () => {
      const result = attributionRulesService.isMetaPaidRevenue({
        ctwaclid: 'wa_123',
      })
      expect(result).toBe(true)
    })

    it('returns true for fbclid only', () => {
      const result = attributionRulesService.isMetaPaidRevenue({
        fbclid: 'fb_456',
      })
      expect(result).toBe(true)
    })

    it('returns true for both ctwaclid and fbclid', () => {
      const result = attributionRulesService.isMetaPaidRevenue({
        ctwaclid: 'wa_123',
        fbclid: 'fb_456',
      })
      expect(result).toBe(true)
    })

    it('returns false for gclid (Google, not Meta)', () => {
      const result = attributionRulesService.isMetaPaidRevenue({
        gclid: 'gc_000',
      })
      expect(result).toBe(false)
    })

    it('returns false for no click IDs', () => {
      const result = attributionRulesService.isMetaPaidRevenue({})
      expect(result).toBe(false)
    })

    it('returns false for null values', () => {
      const result = attributionRulesService.isMetaPaidRevenue({
        ctwaclid: null,
        fbclid: null,
      })
      expect(result).toBe(false)
    })
  })

  describe('validateTimezone', () => {
    it('validates IANA timezone names', () => {
      expect(attributionRulesService.validateTimezone('America/Sao_Paulo')).toBe(true)
      expect(attributionRulesService.validateTimezone('Europe/London')).toBe(true)
      expect(attributionRulesService.validateTimezone('Asia/Tokyo')).toBe(true)
    })

    it('rejects invalid timezone names', () => {
      expect(attributionRulesService.validateTimezone('Invalid/Zone')).toBe(false)
      expect(attributionRulesService.validateTimezone('UTC+2')).toBe(false)
    })
  })

  describe('normalizeTimezone', () => {
    it('keeps valid timezone unchanged', () => {
      const tz = attributionRulesService.normalizeTimezone('Europe/London')
      expect(tz).toBe('Europe/London')
    })

    it('defaults to America/Sao_Paulo for invalid', () => {
      const tz = attributionRulesService.normalizeTimezone('Invalid/Zone')
      expect(tz).toBe('America/Sao_Paulo')
    })

    it('defaults to America/Sao_Paulo when undefined', () => {
      const tz = attributionRulesService.normalizeTimezone(undefined)
      expect(tz).toBe('America/Sao_Paulo')
    })
  })

  describe('isCurrencyValid', () => {
    it('validates ISO 4217 currency codes', () => {
      expect(attributionRulesService.isCurrencyValid('USD')).toBe(true)
      expect(attributionRulesService.isCurrencyValid('BRL')).toBe(true)
      expect(attributionRulesService.isCurrencyValid('EUR')).toBe(true)
    })

    it('rejects invalid formats', () => {
      expect(attributionRulesService.isCurrencyValid('US')).toBe(false)
      expect(attributionRulesService.isCurrencyValid('USDA')).toBe(false)
      expect(attributionRulesService.isCurrencyValid('usd')).toBe(false)
    })
  })

  describe('normalizeCurrency', () => {
    it('keeps valid currency uppercase', () => {
      const curr = attributionRulesService.normalizeCurrency('USD')
      expect(curr).toBe('USD')
    })

    it('uppercases lowercase currency', () => {
      const curr = attributionRulesService.normalizeCurrency('usd')
      expect(curr).toBe('USD')
    })

    it('defaults to BRL for invalid', () => {
      const curr = attributionRulesService.normalizeCurrency('XXX')
      expect(curr).toBe('BRL')
    })

    it('defaults to BRL when undefined', () => {
      const curr = attributionRulesService.normalizeCurrency(undefined)
      expect(curr).toBe('BRL')
    })
  })
})
