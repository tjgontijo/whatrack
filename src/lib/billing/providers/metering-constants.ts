/**
 * Billing Metering Constants
 *
 * Plan limits, pricing, and event tracking configuration.
 */

export const PLAN_LIMITS = {
  starter: {
    eventLimitPerMonth: 200,
    overagePricePerEvent: 0.25,
    monthlyPrice: 97.0,
  },
  pro: {
    eventLimitPerMonth: 500,
    overagePricePerEvent: 0.18,
    monthlyPrice: 197.0,
  },
  agency: {
    eventLimitPerMonth: 10000,
    overagePricePerEvent: 0.12,
    monthlyPrice: 0.0, // Sob consulta
  },
} as const

export const PLAN_FEATURES = {
  starter: {
    maxWhatsAppNumbers: 1,
    maxAdAccounts: 1,
    maxTeamMembers: 2,
    supportLevel: 'email',
  },
  pro: {
    maxWhatsAppNumbers: 2,
    maxAdAccounts: 2,
    maxTeamMembers: 5,
    supportLevel: 'priority',
  },
  agency: {
    maxWhatsAppNumbers: 10,
    maxAdAccounts: 10,
    maxTeamMembers: 999,
    supportLevel: 'dedicated',
  },
} as const

/**
 * Event types that count towards metering
 */
export const EVENT_TYPES = {
  LEAD_QUALIFIED: 'lead_qualified',
  PURCHASE_CONFIRMED: 'purchase_confirmed',
} as const

/**
 * Billing cycle duration in days
 */
export const BILLING_CYCLE_DAYS = 30
