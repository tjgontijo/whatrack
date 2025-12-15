import type { BillingProvider } from '@prisma/client'
import type { IBillingProvider } from '../../provider'
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
} from '../../types'
import { createAsaasClient, type AsaasClient } from './client'
import {
  getAsaasConfig,
  ASAAS_BILLING_TYPE_MAP,
  ASAAS_CYCLE_MAP,
  ASAAS_STATUS_MAP,
  ASAAS_PAYMENT_STATUS_MAP,
} from './config'

// ============================================
// ASAAS API TYPES
// ============================================

interface AsaasCustomerResponse {
  id: string
  name?: string
  email: string
  cpfCnpj?: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  province?: string
  postalCode?: string
  city?: string
  state?: string
  country?: string
}

interface AsaasSubscriptionResponse {
  id: string
  status: keyof typeof ASAAS_STATUS_MAP
  customer: string
  billingType: string
  cycle: string
  value: number
  nextDueDate: string
  deleted?: boolean
}

interface AsaasPaymentResponse {
  id: string
  status: keyof typeof ASAAS_PAYMENT_STATUS_MAP
  value: number
  netValue: number
  billingType: string
  confirmedDate?: string
  paymentDate?: string
  dueDate?: string
  pixQrCodeId?: string
  pixCopiaECola?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  nossoNumero?: string
  description?: string
}

interface AsaasTokenizeResponse {
  creditCardNumber: string
  creditCardBrand: string
  creditCardToken: string
}

interface AsaasRefundResponse {
  id: string
  status: keyof typeof ASAAS_PAYMENT_STATUS_MAP
  value: number
  refundedDate?: string
}

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    status: string
  }
  subscription?: {
    id: string
    status: string
  }
}

// ============================================
// ASAAS PROVIDER IMPLEMENTATION
// ============================================

/**
 * Asaas payment gateway provider implementing IBillingProvider.
 * Handles all billing operations through the Asaas API.
 */
export class AsaasProvider implements IBillingProvider {
  readonly provider: BillingProvider = 'asaas'
  private client: AsaasClient

  constructor(client?: AsaasClient) {
    this.client = client || createAsaasClient()
  }

  // ============================================
  // CUSTOMER OPERATIONS
  // ============================================

  async createCustomer(params: CreateCustomerParams): Promise<CreateCustomerResult> {
    const body = {
      name: params.name,
      email: params.email,
      cpfCnpj: params.taxId,
      phone: params.phone,
      mobilePhone: params.phone,
      postalCode: params.address?.postalCode,
      address: params.address?.line1,
      addressNumber: params.address?.line2,
      province: params.address?.city,
      city: params.address?.city,
      state: params.address?.state,
      country: params.address?.country || 'BR',
    }

    const response = await this.client.post<AsaasCustomerResponse>('/customers', body)

    return {
      externalId: response.id,
      metadata: {
        name: response.name,
        email: response.email,
      },
    }
  }

  async updateCustomer(
    externalId: string,
    params: UpdateCustomerParams
  ): Promise<CreateCustomerResult> {
    const body: Record<string, unknown> = {}

    if (params.name) body.name = params.name
    if (params.email) body.email = params.email
    if (params.taxId) body.cpfCnpj = params.taxId
    if (params.phone) {
      body.phone = params.phone
      body.mobilePhone = params.phone
    }
    if (params.address) {
      body.postalCode = params.address.postalCode
      body.address = params.address.line1
      body.addressNumber = params.address.line2
      body.province = params.address.city
      body.city = params.address.city
      body.state = params.address.state
      body.country = params.address.country || 'BR'
    }

    const response = await this.client.put<AsaasCustomerResponse>(
      `/customers/${externalId}`,
      body
    )

    return {
      externalId: response.id,
      metadata: {
        name: response.name,
        email: response.email,
      },
    }
  }

  async deleteCustomer(externalId: string): Promise<void> {
    await this.client.delete(`/customers/${externalId}`)
  }

  // ============================================
  // SUBSCRIPTION OPERATIONS
  // ============================================

  async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<CreateSubscriptionResult> {
    const billingType = ASAAS_BILLING_TYPE_MAP[params.billingType]
    const cycle = ASAAS_CYCLE_MAP[params.interval]

    const body: Record<string, unknown> = {
      customer: params.customerId,
      billingType,
      cycle,
      value: 0, // Will be set from plan price
      nextDueDate: new Date().toISOString().split('T')[0],
      description: `Subscription - Plan ${params.planId}`,
    }

    // Add credit card token if provided
    if (params.paymentMethodToken && params.billingType === 'credit_card') {
      body.creditCardToken = params.paymentMethodToken
    }

    const response = await this.client.post<AsaasSubscriptionResponse>(
      '/subscriptions',
      body
    )

    const status = this.mapSubscriptionStatus(response.status)
    const nextDueDate = new Date(response.nextDueDate)

    return {
      externalId: response.id,
      status,
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextDueDate,
    }
  }

  async getSubscription(externalId: string): Promise<SubscriptionResult> {
    const response = await this.client.get<AsaasSubscriptionResponse>(
      `/subscriptions/${externalId}`
    )

    const status = this.mapSubscriptionStatus(response.status)
    const nextDueDate = new Date(response.nextDueDate)

    return {
      externalId: response.id,
      status,
      currentPeriodStart: null, // Asaas doesn't provide this
      currentPeriodEnd: nextDueDate,
      cancelAtPeriodEnd: false,
      canceledAt: response.deleted ? new Date() : null,
    }
  }

  async cancelSubscription(
    params: CancelSubscriptionParams
  ): Promise<SubscriptionResult> {
    const response = await this.client.delete<AsaasSubscriptionResponse>(
      `/subscriptions/${params.externalId}`
    )

    return {
      externalId: params.externalId,
      status: 'canceled',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      canceledAt: new Date(),
    }
  }

  async pauseSubscription(externalId: string): Promise<SubscriptionResult> {
    // Asaas doesn't support pausing, we'll update status
    throw new Error('Asaas does not support pausing subscriptions')
  }

  async resumeSubscription(externalId: string): Promise<SubscriptionResult> {
    // Asaas doesn't support resuming paused subscriptions
    throw new Error('Asaas does not support resuming subscriptions')
  }

  // ============================================
  // PAYMENT METHOD OPERATIONS
  // ============================================

  async tokenizeCard(params: TokenizeCardParams): Promise<TokenizeCardResult> {
    const body = {
      customer: params.customerId,
      creditCard: {
        holderName: params.cardHolder,
        number: params.cardNumber,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        ccv: params.cvv,
      },
    }

    const response = await this.client.post<AsaasTokenizeResponse>(
      '/creditCard/tokenize',
      body
    )

    return {
      token: response.creditCardToken,
      brand: response.creditCardBrand,
      last4: response.creditCardNumber,
      expiryMonth: parseInt(params.expiryMonth, 10),
      expiryYear: parseInt(params.expiryYear, 10),
    }
  }

  async deletePaymentMethod(_externalId: string): Promise<void> {
    // Asaas doesn't support deleting payment methods
    // Tokens are associated with the customer
  }

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  async getPayment(externalId: string): Promise<PaymentResult> {
    const response = await this.client.get<AsaasPaymentResponse>(
      `/payments/${externalId}`
    )

    const status = this.mapPaymentStatus(response.status)

    return {
      externalId: response.id,
      status,
      amountCents: Math.round(response.value * 100),
      currency: 'BRL',
      method: response.billingType?.toLowerCase() || null,
      paidAt: response.confirmedDate ? new Date(response.confirmedDate) : null,
      failedAt: null,
      failureReason: null,
      paymentData: {
        pixCopyPaste: response.pixCopiaECola,
        boletoUrl: response.bankSlipUrl,
        boletoBarcode: response.nossoNumero,
      },
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    const body: Record<string, unknown> = {}

    if (params.amountCents) {
      body.value = params.amountCents / 100
    }
    if (params.reason) {
      body.description = params.reason
    }

    const response = await this.client.post<AsaasRefundResponse>(
      `/payments/${params.externalId}/refund`,
      body
    )

    return {
      externalId: response.id,
      status: this.mapPaymentStatus(response.status),
      amountCents: Math.round(response.value * 100),
      refundedAt: response.refundedDate ? new Date(response.refundedDate) : null,
    }
  }

  // ============================================
  // INVOICE OPERATIONS
  // ============================================

  async getInvoice(externalId: string): Promise<InvoiceResult> {
    const response = await this.client.get<AsaasPaymentResponse>(
      `/payments/${externalId}`
    )

    return {
      externalId: response.id,
      status: this.mapPaymentStatus(response.status),
      subtotalCents: Math.round(response.value * 100),
      discountCents: 0,
      taxCents: 0,
      totalCents: Math.round(response.value * 100),
      currency: 'BRL',
      dueDate: response.dueDate ? new Date(response.dueDate) : null,
      paidAt: response.confirmedDate ? new Date(response.confirmedDate) : null,
      items: [
        {
          description: response.description || 'Subscription payment',
          quantity: 1,
          unitCents: Math.round(response.value * 100),
          totalCents: Math.round(response.value * 100),
        },
      ],
      paymentData: {
        pixCopyPaste: response.pixCopiaECola,
        boletoUrl: response.bankSlipUrl,
        boletoBarcode: response.nossoNumero,
      },
    }
  }

  // ============================================
  // WEBHOOK OPERATIONS
  // ============================================

  validateWebhookSignature(
    payload: string,
    signature: string
  ): WebhookValidationResult {
    const config = getAsaasConfig()

    // Asaas uses the webhook token as the signature
    const isValid = signature === config.webhookToken

    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid webhook signature',
      }
    }

    try {
      const data = JSON.parse(payload) as AsaasWebhookPayload

      return {
        isValid: true,
        event: {
          provider: 'asaas',
          eventId: data.payment?.id || data.subscription?.id || `evt_${Date.now()}`,
          eventType: data.event,
          payload: data as unknown as Record<string, unknown>,
        },
      }
    } catch {
      return {
        isValid: false,
        error: 'Failed to parse webhook payload',
      }
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapSubscriptionStatus(asaasStatus: keyof typeof ASAAS_STATUS_MAP): string {
    return ASAAS_STATUS_MAP[asaasStatus] || 'incomplete'
  }

  private mapPaymentStatus(asaasStatus: keyof typeof ASAAS_PAYMENT_STATUS_MAP): string {
    return ASAAS_PAYMENT_STATUS_MAP[asaasStatus] || 'pending'
  }
}
