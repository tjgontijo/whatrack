/**
 * Billing Providers Module
 *
 * Available providers:
 * - Asaas (BRL) - Brazilian payments
 * - Stripe (USD) - Coming soon
 * - MercadoPago - Coming soon
 */

// Asaas Provider
export { AsaasProvider } from './asaas'
export {
  createAsaasClient,
  getAsaasClient,
  resetAsaasClient,
  getAsaasConfig,
  AsaasConfigSchema,
  ASAAS_BILLING_TYPE_MAP,
  ASAAS_CYCLE_MAP,
  ASAAS_STATUS_MAP,
  ASAAS_PAYMENT_STATUS_MAP,
  // Webhook Processor
  AsaasWebhookProcessor,
} from './asaas'

// Re-export types
export type {
  AsaasClient,
  AsaasClientOptions,
  AsaasConfig,
  AsaasBillingType,
  AsaasCycle,
  // Webhook types
  AsaasWebhookEventType,
  AsaasPaymentPayload,
  AsaasWebhookPayload,
  WebhookProcessResult,
} from './asaas'
