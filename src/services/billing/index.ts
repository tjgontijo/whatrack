/**
 * Billing Service Module
 *
 * Provider-agnostic billing operations supporting:
 * - Asaas (BRL)
 * - Stripe (USD) - Future
 * - MercadoPago - Future
 */

// Types and Zod Schemas
export {
  // Address
  AddressSchema,
  type Address,

  // Customer
  CreateCustomerParamsSchema,
  type CreateCustomerParams,
  UpdateCustomerParamsSchema,
  type UpdateCustomerParams,
  CreateCustomerResultSchema,
  type CreateCustomerResult,

  // Subscription
  BillingTypeSchema,
  type BillingType,
  IntervalSchema,
  type Interval,
  CreateSubscriptionParamsSchema,
  type CreateSubscriptionParams,
  CreateSubscriptionResultSchema,
  type CreateSubscriptionResult,
  CancelSubscriptionParamsSchema,
  type CancelSubscriptionParams,
  SubscriptionResultSchema,
  type SubscriptionResult,

  // Payment Data
  PaymentDataSchema,
  type PaymentData,

  // Card Tokenization
  TokenizeCardParamsSchema,
  type TokenizeCardParams,
  TokenizeCardResultSchema,
  type TokenizeCardResult,

  // Payment
  PaymentResultSchema,
  type PaymentResult,
  RefundParamsSchema,
  type RefundParams,
  RefundResultSchema,
  type RefundResult,

  // Invoice
  InvoiceItemSchema,
  type InvoiceItem,
  InvoiceResultSchema,
  type InvoiceResult,

  // Webhook
  WebhookEventSchema,
  type WebhookEvent,
  WebhookValidationResultSchema,
  type WebhookValidationResult,

  // Re-exported Prisma types
  type BillingProvider,
  type PlanInterval,
  type PaymentMethod,
  type PaymentStatus,
  type SubscriptionStatus,
} from './types'

// Provider Interface and Abstract Class
export {
  type IBillingProvider,
  AbstractBillingProvider,
  isBillingProvider,
} from './provider'

// Error Classes
export {
  BillingError,
  PaymentFailedError,
  CustomerNotFoundError,
  SubscriptionNotFoundError,
  InvalidWebhookError,
  ProviderApiError,
  CardTokenizationError,
  InvoiceNotFoundError,
  RefundFailedError,
} from './errors'

// Providers
export {
  // Asaas Provider
  AsaasProvider,
  createAsaasClient,
  getAsaasClient,
  getAsaasConfig,
  ASAAS_BILLING_TYPE_MAP,
  ASAAS_CYCLE_MAP,
  type AsaasClient,
  type AsaasConfig,
  // Asaas Webhook
  AsaasWebhookProcessor,
  type AsaasWebhookEventType,
  type AsaasPaymentPayload,
  type AsaasWebhookPayload,
  type WebhookProcessResult,
} from './providers'

// Services
export {
  BillingService,
  type BillingServiceDeps,
  type CreateSubscriptionParams as BillingCreateSubscriptionParams,
  type TokenizeCardParams as BillingTokenizeCardParams,
  type CancelSubscriptionOptions,
  type ChangePlanParams,
  type ChangePlanResult,
} from './billing-service'
export { PlanService, type PlanWithPrices, type PlanPriceWithPlan } from './plan-service'
export {
  SubscriptionService,
  type SubscriptionWithPlan,
  type SubscriptionWithRelations,
  type CreateSubscriptionData,
} from './subscription-service'
export {
  BillingCustomerService,
  type BillingCustomerWithExternals,
  type CreateBillingCustomerData,
  type UpdateBillingCustomerData,
} from './billing-customer-service'
export {
  InvoiceService,
  type InvoiceWithItems,
  type InvoiceWithRelations,
  type CreateInvoiceData,
  type CreateInvoiceItemData,
} from './invoice-service'
export {
  WebhookService,
  type WebhookEventWithDetails,
  type CreateWebhookEventData,
} from './webhook-service'
export {
  LimitService,
  type OrganizationLimits,
  type UsageStat,
  type UsageStats,
  type LimitableResource,
  type LimitCheckResult,
} from './limit-service'
export {
  BillingNotificationService,
  type PaymentConfirmedParams,
  type PaymentFailedParams,
  type SubscriptionCanceledParams,
  type InvoiceParams,
} from './notification-service'
