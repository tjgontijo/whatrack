import {
  BillingProvider,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { ASAAS_PAYMENT_STATUS_MAP, ASAAS_STATUS_MAP } from './config'
import { BillingNotificationService } from '../../notification-service'
import { aiCreditsService } from '@/services/credits'

/**
 * Asaas webhook event types
 */
export type AsaasWebhookEventType =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
  | 'PAYMENT_ANTICIPATED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_DUNNING_REQUESTED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  | 'PAYMENT_CHECKOUT_VIEWED'

/**
 * Asaas payment webhook payload
 */
export interface AsaasPaymentPayload {
  id: string
  customer: string
  subscription?: string
  billingType: string
  status: keyof typeof ASAAS_PAYMENT_STATUS_MAP
  value: number
  netValue?: number
  originalValue?: number
  dueDate: string
  confirmedDate?: string
  paymentDate?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  pixQrCodeId?: string
  pixCopiaECola?: string
  nossoNumero?: string
  externalReference?: string
  description?: string
}

/**
 * Asaas webhook full payload
 */
export interface AsaasWebhookPayload {
  event: AsaasWebhookEventType
  payment: AsaasPaymentPayload
}

/**
 * Result of processing a webhook event
 */
export interface WebhookProcessResult {
  success: boolean
  message: string
  updatedEntities?: {
    payment?: string
    subscription?: string
    invoice?: string
  }
}

/**
 * Prisma client type for dependency injection
 */
type PrismaClient = typeof defaultPrisma

/**
 * AsaasWebhookProcessor handles processing of Asaas webhook events.
 * Updates payments, subscriptions, and invoices based on webhook data.
 */
export class AsaasWebhookProcessor {
  private prisma: PrismaClient
  private notificationService: BillingNotificationService
  readonly provider: BillingProvider = 'asaas'

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
    this.notificationService = new BillingNotificationService()
  }

  /**
   * Get customer email and details for notifications
   */
  private async getCustomerDetails(customerId: string): Promise<{
    email: string | null
    name: string | null
    planName: string | null
  } | null> {
    const billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: {
        externalCustomers: {
          some: { externalId: customerId },
        },
      },
      include: {
        organization: {
          include: {
            members: {
              where: { role: 'owner' },
              include: { user: { select: { email: true, name: true } } },
              take: 1,
            },
          },
        },
      },
    })

    if (!billingCustomer) return null

    const ownerMember = billingCustomer.organization.members[0]
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        billingCustomerId: billingCustomer.id,
        status: { in: ['active', 'trialing', 'past_due'] },
      },
      include: { plan: true },
    })

    return {
      email: billingCustomer.email || ownerMember?.user.email || null,
      name: billingCustomer.name || ownerMember?.user.name || null,
      planName: subscription?.plan.name || null,
    }
  }

  /**
   * Process a webhook event
   */
  async process(payload: AsaasWebhookPayload): Promise<WebhookProcessResult> {
    const { event, payment } = payload

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_RECEIVED_IN_CASH_UNDONE':
      case 'PAYMENT_DUNNING_RECEIVED':
        return this.handlePaymentSuccess(payment)

      case 'PAYMENT_OVERDUE':
        return this.handlePaymentOverdue(payment)

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_PARTIALLY_REFUNDED':
        return this.handlePaymentRefunded(payment)

      case 'PAYMENT_DELETED':
        return this.handlePaymentDeleted(payment)

      case 'PAYMENT_CHARGEBACK_REQUESTED':
      case 'PAYMENT_CHARGEBACK_DISPUTE':
        return this.handlePaymentChargeback(payment)

      case 'PAYMENT_CREATED':
      case 'PAYMENT_AUTHORIZED':
      case 'PAYMENT_AWAITING_RISK_ANALYSIS':
      case 'PAYMENT_APPROVED_BY_RISK_ANALYSIS':
        return this.handlePaymentPending(payment)

      case 'PAYMENT_REPROVED_BY_RISK_ANALYSIS':
      case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
        return this.handlePaymentFailed(payment)

      default:
        return {
          success: true,
          message: `Event ${event} acknowledged but not processed`,
        }
    }
  }

  /**
   * Handle successful payment (confirmed/received)
   */
  private async handlePaymentSuccess(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    const updatedEntities: WebhookProcessResult['updatedEntities'] = {}

    // Update payment record
    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.succeeded,
          paidAt: payment.confirmedDate
            ? new Date(payment.confirmedDate)
            : new Date(),
        },
      })
      updatedEntities.payment = existingPayment.id
    }

    // Update subscription status if linked
    if (payment.subscription) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { externalId: payment.subscription },
        include: {
          plan: true,
          billingCustomer: true,
        },
      })

      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.active,
          },
        })
        updatedEntities.subscription = subscription.id

        // Add AI credits when payment is confirmed
        if (subscription.billingCustomer && subscription.plan.aiCreditsQuota > 0) {
          try {
            await aiCreditsService.addCredits(
              subscription.billingCustomer.organizationId,
              subscription.plan.aiCreditsQuota
            )
          } catch (error) {
            console.error('[AsaasWebhookProcessor] Failed to add AI credits', error)
          }
        }
      }
    }

    // Update invoice status if linked
    if (existingPayment?.invoiceId) {
      await this.prisma.invoice.update({
        where: { id: existingPayment.invoiceId },
        data: {
          status: PaymentStatus.succeeded,
          paidAt: payment.confirmedDate
            ? new Date(payment.confirmedDate)
            : new Date(),
        },
      })
      updatedEntities.invoice = existingPayment.invoiceId
    }

    // Send payment confirmation email
    try {
      const customerDetails = await this.getCustomerDetails(payment.customer)
      if (customerDetails?.email) {
        await this.notificationService.sendPaymentConfirmation({
          email: customerDetails.email,
          customerName: customerDetails.name || undefined,
          amountCents: Math.round(payment.value * 100),
          planName: customerDetails.planName || 'Assinatura',
          invoiceUrl: payment.invoiceUrl,
        })
      }
    } catch (error) {
      console.error('[AsaasWebhookProcessor] Failed to send payment confirmation email', error)
    }

    return {
      success: true,
      message: 'Payment marked as successful',
      updatedEntities,
    }
  }

  /**
   * Handle overdue payment
   */
  private async handlePaymentOverdue(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    const updatedEntities: WebhookProcessResult['updatedEntities'] = {}
    const failureReason = 'Pagamento vencido'

    // Update payment record
    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.failed,
          failureReason,
        },
      })
      updatedEntities.payment = existingPayment.id
    }

    // Update subscription to past_due
    if (payment.subscription) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { externalId: payment.subscription },
      })

      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.past_due,
          },
        })
        updatedEntities.subscription = subscription.id
      }
    }

    // Send payment failed email for overdue payment
    try {
      const customerDetails = await this.getCustomerDetails(payment.customer)
      if (customerDetails?.email) {
        await this.notificationService.sendPaymentFailed({
          email: customerDetails.email,
          customerName: customerDetails.name || undefined,
          amountCents: Math.round(payment.value * 100),
          planName: customerDetails.planName || 'Assinatura',
          failureReason,
        })
      }
    } catch (error) {
      console.error('[AsaasWebhookProcessor] Failed to send payment overdue email', error)
    }

    return {
      success: true,
      message: 'Payment marked as overdue',
      updatedEntities,
    }
  }

  /**
   * Handle refunded payment
   */
  private async handlePaymentRefunded(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    const updatedEntities: WebhookProcessResult['updatedEntities'] = {}

    // Update payment record
    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.refunded,
          refundedAt: new Date(),
        },
      })
      updatedEntities.payment = existingPayment.id
    }

    // Update invoice status
    if (existingPayment?.invoiceId) {
      await this.prisma.invoice.update({
        where: { id: existingPayment.invoiceId },
        data: {
          status: PaymentStatus.refunded,
        },
      })
      updatedEntities.invoice = existingPayment.invoiceId
    }

    return {
      success: true,
      message: 'Payment marked as refunded',
      updatedEntities,
    }
  }

  /**
   * Handle deleted payment
   */
  private async handlePaymentDeleted(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    // We don't delete payments, just mark them
    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.failed,
          failureReason: 'Payment deleted by provider',
        },
      })

      return {
        success: true,
        message: 'Payment marked as deleted',
        updatedEntities: { payment: existingPayment.id },
      }
    }

    return {
      success: true,
      message: 'Deleted payment not found locally',
    }
  }

  /**
   * Handle chargeback events
   */
  private async handlePaymentChargeback(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    const updatedEntities: WebhookProcessResult['updatedEntities'] = {}

    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.processing,
          failureReason: 'Chargeback in progress',
        },
      })
      updatedEntities.payment = existingPayment.id
    }

    // Put subscription on hold during chargeback
    if (payment.subscription) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { externalId: payment.subscription },
      })

      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.past_due,
          },
        })
        updatedEntities.subscription = subscription.id
      }
    }

    return {
      success: true,
      message: 'Payment marked as chargeback in progress',
      updatedEntities,
    }
  }

  /**
   * Handle pending payment events
   */
  private async handlePaymentPending(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.processing,
        },
      })

      return {
        success: true,
        message: 'Payment status updated to processing',
        updatedEntities: { payment: existingPayment.id },
      }
    }

    return {
      success: true,
      message: 'Pending payment event acknowledged',
    }
  }

  /**
   * Handle failed payment events
   */
  private async handlePaymentFailed(
    payment: AsaasPaymentPayload
  ): Promise<WebhookProcessResult> {
    const updatedEntities: WebhookProcessResult['updatedEntities'] = {}
    const failureReason = 'Payment refused or risk analysis failed'

    const existingPayment = await this.prisma.payment.findFirst({
      where: { externalId: payment.id },
    })

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.failed,
          failureReason,
        },
      })
      updatedEntities.payment = existingPayment.id
    }

    // Update subscription status
    if (payment.subscription) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { externalId: payment.subscription },
      })

      if (subscription) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.past_due,
          },
        })
        updatedEntities.subscription = subscription.id
      }
    }

    // Send payment failed email
    try {
      const customerDetails = await this.getCustomerDetails(payment.customer)
      if (customerDetails?.email) {
        await this.notificationService.sendPaymentFailed({
          email: customerDetails.email,
          customerName: customerDetails.name || undefined,
          amountCents: Math.round(payment.value * 100),
          planName: customerDetails.planName || 'Assinatura',
          failureReason,
        })
      }
    } catch (error) {
      console.error('[AsaasWebhookProcessor] Failed to send payment failed email', error)
    }

    return {
      success: true,
      message: 'Payment marked as failed',
      updatedEntities,
    }
  }
}
