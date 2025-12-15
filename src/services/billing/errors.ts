import type { BillingProvider } from '@prisma/client'

/**
 * Base error class for all billing-related errors.
 * Extends Error with additional billing-specific properties.
 */
export class BillingError extends Error {
  public readonly code?: string
  public readonly provider?: BillingProvider | string

  constructor(
    message: string,
    code?: string,
    provider?: BillingProvider | string
  ) {
    super(message)
    this.name = 'BillingError'
    this.code = code
    this.provider = provider

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BillingError)
    }
  }
}

/**
 * Error thrown when a payment fails to process.
 */
export class PaymentFailedError extends BillingError {
  public readonly reason: string
  public readonly paymentId?: string

  constructor(
    message: string,
    reason: string,
    paymentId?: string,
    provider?: BillingProvider | string
  ) {
    super(message, 'PAYMENT_FAILED', provider)
    this.name = 'PaymentFailedError'
    this.reason = reason
    this.paymentId = paymentId
  }
}

/**
 * Error thrown when a customer is not found in the provider.
 */
export class CustomerNotFoundError extends BillingError {
  public readonly customerId: string

  constructor(customerId: string, provider?: BillingProvider | string) {
    super(`Customer not found: ${customerId}`, 'CUSTOMER_NOT_FOUND', provider)
    this.name = 'CustomerNotFoundError'
    this.customerId = customerId
  }
}

/**
 * Error thrown when a subscription is not found in the provider.
 */
export class SubscriptionNotFoundError extends BillingError {
  public readonly subscriptionId: string

  constructor(subscriptionId: string, provider?: BillingProvider | string) {
    super(
      `Subscription not found: ${subscriptionId}`,
      'SUBSCRIPTION_NOT_FOUND',
      provider
    )
    this.name = 'SubscriptionNotFoundError'
    this.subscriptionId = subscriptionId
  }
}

/**
 * Error thrown when webhook signature validation fails.
 */
export class InvalidWebhookError extends BillingError {
  constructor(message: string, provider?: BillingProvider | string) {
    super(message, 'INVALID_WEBHOOK', provider)
    this.name = 'InvalidWebhookError'
  }
}

/**
 * Error thrown when the billing provider API returns an error.
 */
export class ProviderApiError extends BillingError {
  public readonly statusCode: number
  public readonly response: unknown

  constructor(
    message: string,
    statusCode: number,
    response: unknown,
    provider?: BillingProvider | string
  ) {
    super(message, 'PROVIDER_API_ERROR', provider)
    this.name = 'ProviderApiError'
    this.statusCode = statusCode
    this.response = response
  }
}

/**
 * Error thrown when card tokenization fails.
 */
export class CardTokenizationError extends BillingError {
  public readonly reason: string

  constructor(
    message: string,
    reason: string,
    provider?: BillingProvider | string
  ) {
    super(message, 'CARD_TOKENIZATION_FAILED', provider)
    this.name = 'CardTokenizationError'
    this.reason = reason
  }
}

/**
 * Error thrown when an invoice is not found.
 */
export class InvoiceNotFoundError extends BillingError {
  public readonly invoiceId: string

  constructor(invoiceId: string, provider?: BillingProvider | string) {
    super(`Invoice not found: ${invoiceId}`, 'INVOICE_NOT_FOUND', provider)
    this.name = 'InvoiceNotFoundError'
    this.invoiceId = invoiceId
  }
}

/**
 * Error thrown when a refund fails.
 */
export class RefundFailedError extends BillingError {
  public readonly reason: string
  public readonly paymentId?: string

  constructor(
    message: string,
    reason: string,
    paymentId?: string,
    provider?: BillingProvider | string
  ) {
    super(message, 'REFUND_FAILED', provider)
    this.name = 'RefundFailedError'
    this.reason = reason
    this.paymentId = paymentId
  }
}
