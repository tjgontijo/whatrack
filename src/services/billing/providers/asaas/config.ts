import { z } from 'zod'

/**
 * Asaas Configuration Schema
 */
export const AsaasConfigSchema = z.object({
  apiKey: z.string().min(1, 'ASAAS_API_KEY is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  webhookToken: z.string().optional(),
  baseUrl: z.string().url(),
})

export type AsaasConfig = z.infer<typeof AsaasConfigSchema>

/**
 * Asaas API base URLs
 */
const ASAAS_URLS = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/v3',
} as const

/**
 * Mapping from internal billing types to Asaas billing types
 */
export const ASAAS_BILLING_TYPE_MAP = {
  credit_card: 'CREDIT_CARD',
  pix: 'PIX',
  boleto: 'BOLETO',
} as const

/**
 * Mapping from internal intervals to Asaas cycles
 */
export const ASAAS_CYCLE_MAP = {
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
} as const

/**
 * Reverse mapping from Asaas billing types to internal types
 */
export const ASAAS_BILLING_TYPE_REVERSE_MAP = {
  CREDIT_CARD: 'credit_card',
  PIX: 'pix',
  BOLETO: 'boleto',
} as const

/**
 * Reverse mapping from Asaas cycles to internal intervals
 */
export const ASAAS_CYCLE_REVERSE_MAP = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const

/**
 * Asaas subscription status mapping
 */
export const ASAAS_STATUS_MAP = {
  PENDING: 'incomplete',
  ACTIVE: 'active',
  OVERDUE: 'past_due',
  EXPIRED: 'canceled',
} as const

/**
 * Asaas payment status mapping
 */
export const ASAAS_PAYMENT_STATUS_MAP = {
  PENDING: 'pending',
  RECEIVED: 'succeeded',
  CONFIRMED: 'succeeded',
  OVERDUE: 'failed',
  REFUNDED: 'refunded',
  RECEIVED_IN_CASH: 'succeeded',
  REFUND_REQUESTED: 'processing',
  CHARGEBACK_REQUESTED: 'processing',
  CHARGEBACK_DISPUTE: 'processing',
  AWAITING_CHARGEBACK_REVERSAL: 'processing',
  DUNNING_REQUESTED: 'processing',
  DUNNING_RECEIVED: 'succeeded',
  AWAITING_RISK_ANALYSIS: 'processing',
} as const

/**
 * Get Asaas configuration from environment variables
 * @throws Error if required environment variables are missing
 */
export function getAsaasConfig(): AsaasConfig {
  const environment = (process.env.ASAAS_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production'

  const rawConfig = {
    apiKey: process.env.ASAAS_API_KEY,
    environment,
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
    baseUrl: ASAAS_URLS[environment],
  }

  const result = AsaasConfigSchema.safeParse(rawConfig)

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${String(e.path.join('.'))}: ${e.message}`)
      .join(', ')
    throw new Error(`Invalid Asaas configuration: ${errors}`)
  }

  return result.data
}

/**
 * Type for Asaas billing types
 */
export type AsaasBillingType = (typeof ASAAS_BILLING_TYPE_MAP)[keyof typeof ASAAS_BILLING_TYPE_MAP]

/**
 * Type for Asaas cycles
 */
export type AsaasCycle = (typeof ASAAS_CYCLE_MAP)[keyof typeof ASAAS_CYCLE_MAP]
