import 'server-only'

export enum SourceType {
  META_PAID = 'meta_paid',
  OTHER_PAID = 'other_paid',
  ORGANIC = 'organic',
  UNKNOWN = 'unknown',
}

export interface AttributionResult {
  sourceType: SourceType
  channel: string
  confidence: number // 0-100
}

/**
 * Classifies a lead/sale by click ID evidence.
 *
 * Rules:
 * - ctwaclid (Meta WhatsApp) = Meta paid (100%)
 * - fbclid (Meta Facebook) = Meta paid (100%)
 * - ttclid (TikTok) = Other paid (100%)
 * - gclid (Google) = Other paid (100%)
 * - UTM + sourceType set = explicit (high confidence)
 * - No IDs, no UTM = Organic (default)
 */
export class AttributionRulesService {
  classifyLead(data: {
    ctwaclid?: string | null
    fbclid?: string | null
    ttclid?: string | null
    gclid?: string | null
    utmSource?: string | null
    utmMedium?: string | null
    sourceType?: string | null
  }): AttributionResult {
    // Meta signals (highest priority)
    if (data.ctwaclid || data.fbclid) {
      return {
        sourceType: SourceType.META_PAID,
        channel: data.ctwaclid ? 'whatsapp' : 'facebook',
        confidence: 100,
      }
    }

    // Other paid platforms
    if (data.ttclid) {
      return {
        sourceType: SourceType.OTHER_PAID,
        channel: 'tiktok',
        confidence: 100,
      }
    }

    if (data.gclid) {
      return {
        sourceType: SourceType.OTHER_PAID,
        channel: 'google',
        confidence: 100,
      }
    }

    // Explicit sourceType from tracking
    if (data.sourceType) {
      if (data.sourceType === 'paid') {
        return {
          sourceType: SourceType.OTHER_PAID,
          channel: data.utmMedium || 'paid',
          confidence: 80,
        }
      }
      if (data.sourceType === 'organic') {
        return {
          sourceType: SourceType.ORGANIC,
          channel: data.utmSource || 'organic',
          confidence: 80,
        }
      }
    }

    // UTM heuristics
    if (data.utmMedium?.toLowerCase().includes('paid')) {
      return {
        sourceType: SourceType.OTHER_PAID,
        channel: `${data.utmSource || 'utm'}_${data.utmMedium}`,
        confidence: 60,
      }
    }

    if (data.utmMedium?.toLowerCase().includes('organic')) {
      return {
        sourceType: SourceType.ORGANIC,
        channel: `${data.utmSource || 'utm'}_${data.utmMedium}`,
        confidence: 60,
      }
    }

    if (data.utmSource) {
      return {
        sourceType: SourceType.ORGANIC,
        channel: data.utmSource,
        confidence: 40,
      }
    }

    // Fallback
    return {
      sourceType: SourceType.UNKNOWN,
      channel: 'unknown',
      confidence: 0,
    }
  }

  /**
   * Check if a lead should count towards Meta ROAS.
   * Only high-confidence Meta signals count.
   */
  isMetaPaidRevenue(data: {
    ctwaclid?: string | null
    fbclid?: string | null
  }): boolean {
    return !!(data.ctwaclid || data.fbclid)
  }

  /**
   * Validate timezone name (IANA format).
   */
  validateTimezone(tz: string): boolean {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return true
    } catch {
      return false
    }
  }

  /**
   * Normalize timezone to standard IANA name.
   */
  normalizeTimezone(tz?: string): string {
    const defaultTz = 'America/Sao_Paulo'
    if (!tz) return defaultTz
    if (this.validateTimezone(tz)) return tz
    return defaultTz
  }

  /**
   * Validate currency code (ISO 4217).
   */
  isCurrencyValid(currency: string): boolean {
    // Basic validation: 3 uppercase letters
    return /^[A-Z]{3}$/.test(currency)
  }

  /**
   * Normalize currency to standard ISO code.
   */
  normalizeCurrency(currency?: string): string {
    const defaultCurrency = 'BRL'
    if (!currency) return defaultCurrency
    const upper = currency.toUpperCase()
    if (this.isCurrencyValid(upper)) return upper
    return defaultCurrency
  }
}

export const attributionRulesService = new AttributionRulesService()
