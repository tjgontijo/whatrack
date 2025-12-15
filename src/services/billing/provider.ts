import type { BillingProvider } from '@prisma/client'
import type {
  CreateCustomerParams,
  CreateCustomerResult,
  UpdateCustomerParams,
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  CancelSubscriptionParams,
  SubscriptionResult,
  TokenizeCardParams,
  TokenizeCardResult,
  PaymentResult,
  RefundParams,
  RefundResult,
  InvoiceResult,
  WebhookValidationResult,
} from './types'

/**
 * Interface defining the contract for all billing provider implementations.
 * This enables provider-agnostic billing operations.
 */
export interface IBillingProvider {
  /**
   * The billing provider type (asaas, stripe, mercadopago, manual)
   */
  readonly provider: BillingProvider

  // ============================================
  // CUSTOMER OPERATIONS
  // ============================================

  /**
   * Create a new customer in the billing provider.
   */
  createCustomer(params: CreateCustomerParams): Promise<CreateCustomerResult>

  /**
   * Update an existing customer in the billing provider.
   */
  updateCustomer(
    externalId: string,
    params: UpdateCustomerParams
  ): Promise<CreateCustomerResult>

  /**
   * Delete a customer from the billing provider.
   */
  deleteCustomer(externalId: string): Promise<void>

  // ============================================
  // SUBSCRIPTION OPERATIONS
  // ============================================

  /**
   * Create a new subscription for a customer.
   */
  createSubscription(
    params: CreateSubscriptionParams
  ): Promise<CreateSubscriptionResult>

  /**
   * Get subscription details from the provider.
   */
  getSubscription(externalId: string): Promise<SubscriptionResult>

  /**
   * Cancel a subscription.
   */
  cancelSubscription(params: CancelSubscriptionParams): Promise<SubscriptionResult>

  /**
   * Pause a subscription (if supported by provider).
   */
  pauseSubscription(externalId: string): Promise<SubscriptionResult>

  /**
   * Resume a paused subscription.
   */
  resumeSubscription(externalId: string): Promise<SubscriptionResult>

  // ============================================
  // PAYMENT METHOD OPERATIONS
  // ============================================

  /**
   * Tokenize a credit card for future use.
   */
  tokenizeCard(params: TokenizeCardParams): Promise<TokenizeCardResult>

  /**
   * Delete a stored payment method.
   */
  deletePaymentMethod(externalId: string): Promise<void>

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  /**
   * Get payment details from the provider.
   */
  getPayment(externalId: string): Promise<PaymentResult>

  /**
   * Refund a payment (fully or partially).
   */
  refundPayment(params: RefundParams): Promise<RefundResult>

  // ============================================
  // INVOICE OPERATIONS
  // ============================================

  /**
   * Get invoice details from the provider.
   */
  getInvoice(externalId: string): Promise<InvoiceResult>

  // ============================================
  // WEBHOOK OPERATIONS
  // ============================================

  /**
   * Validate and parse a webhook payload.
   */
  validateWebhookSignature(
    payload: string,
    signature: string
  ): WebhookValidationResult
}

/**
 * Abstract base class for billing providers.
 * Provides default implementations that throw NotImplementedError.
 * Concrete implementations should override these methods.
 */
export abstract class AbstractBillingProvider implements IBillingProvider {
  abstract readonly provider: BillingProvider

  // Customer operations
  createCustomer(_params: CreateCustomerParams): Promise<CreateCustomerResult> {
    throw new Error('Method not implemented: createCustomer')
  }

  updateCustomer(
    _externalId: string,
    _params: UpdateCustomerParams
  ): Promise<CreateCustomerResult> {
    throw new Error('Method not implemented: updateCustomer')
  }

  deleteCustomer(_externalId: string): Promise<void> {
    throw new Error('Method not implemented: deleteCustomer')
  }

  // Subscription operations
  createSubscription(
    _params: CreateSubscriptionParams
  ): Promise<CreateSubscriptionResult> {
    throw new Error('Method not implemented: createSubscription')
  }

  getSubscription(_externalId: string): Promise<SubscriptionResult> {
    throw new Error('Method not implemented: getSubscription')
  }

  cancelSubscription(_params: CancelSubscriptionParams): Promise<SubscriptionResult> {
    throw new Error('Method not implemented: cancelSubscription')
  }

  pauseSubscription(_externalId: string): Promise<SubscriptionResult> {
    throw new Error('Method not implemented: pauseSubscription')
  }

  resumeSubscription(_externalId: string): Promise<SubscriptionResult> {
    throw new Error('Method not implemented: resumeSubscription')
  }

  // Payment method operations
  tokenizeCard(_params: TokenizeCardParams): Promise<TokenizeCardResult> {
    throw new Error('Method not implemented: tokenizeCard')
  }

  deletePaymentMethod(_externalId: string): Promise<void> {
    throw new Error('Method not implemented: deletePaymentMethod')
  }

  // Payment operations
  getPayment(_externalId: string): Promise<PaymentResult> {
    throw new Error('Method not implemented: getPayment')
  }

  refundPayment(_params: RefundParams): Promise<RefundResult> {
    throw new Error('Method not implemented: refundPayment')
  }

  // Invoice operations
  getInvoice(_externalId: string): Promise<InvoiceResult> {
    throw new Error('Method not implemented: getInvoice')
  }

  // Webhook operations
  validateWebhookSignature(
    _payload: string,
    _signature: string
  ): WebhookValidationResult {
    throw new Error('Method not implemented: validateWebhookSignature')
  }
}

/**
 * Type guard to check if an object implements IBillingProvider
 */
export function isBillingProvider(obj: unknown): obj is IBillingProvider {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const provider = obj as Partial<IBillingProvider>
  return (
    typeof provider.provider === 'string' &&
    typeof provider.createCustomer === 'function' &&
    typeof provider.createSubscription === 'function' &&
    typeof provider.validateWebhookSignature === 'function'
  )
}
