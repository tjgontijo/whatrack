import { resendProvider } from '@/services/mail/resend'
import { generatePaymentConfirmedEmail } from '@/services/mail/templates/PaymentConfirmedEmail'
import { generatePaymentFailedEmail } from '@/services/mail/templates/PaymentFailedEmail'
import { generateSubscriptionCanceledEmail } from '@/services/mail/templates/SubscriptionCanceledEmail'
import { generateInvoiceEmail } from '@/services/mail/templates/InvoiceEmail'

/**
 * Parameters for sending payment confirmation email
 */
export interface PaymentConfirmedParams {
  email: string
  customerName?: string
  amountCents: number
  planName: string
  invoiceUrl?: string
}

/**
 * Parameters for sending payment failed email
 */
export interface PaymentFailedParams {
  email: string
  customerName?: string
  amountCents: number
  planName: string
  failureReason?: string
  updatePaymentUrl?: string
}

/**
 * Parameters for sending subscription canceled email
 */
export interface SubscriptionCanceledParams {
  email: string
  customerName?: string
  planName: string
  endDate: Date
  resubscribeUrl?: string
}

/**
 * Parameters for sending invoice email
 */
export interface InvoiceParams {
  email: string
  customerName?: string
  invoiceNumber: string
  amountCents: number
  dueDate: Date
  planName: string
  invoiceUrl?: string
}

/**
 * Format currency in BRL
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

/**
 * Format date in pt-BR
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * BillingNotificationService handles sending billing-related email notifications.
 * Uses react-email templates and the configured email provider.
 */
export class BillingNotificationService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatrack.com'
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(params: PaymentConfirmedParams): Promise<void> {
    const { email, customerName, amountCents, planName, invoiceUrl } = params

    const emailContent = await generatePaymentConfirmedEmail({
      customerName,
      amount: formatCurrency(amountCents),
      planName,
      invoiceUrl,
    })

    const result = await resendProvider.send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!result.success) {
      console.error('[BillingNotificationService] Failed to send payment confirmation email', {
        email,
        error: result.error,
      })
    }
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailed(params: PaymentFailedParams): Promise<void> {
    const { email, customerName, amountCents, planName, failureReason } = params
    const updatePaymentUrl = `${this.baseUrl}/dashboard/settings/billing`

    const emailContent = await generatePaymentFailedEmail({
      customerName,
      amount: formatCurrency(amountCents),
      planName,
      failureReason,
      updatePaymentUrl,
    })

    const result = await resendProvider.send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!result.success) {
      console.error('[BillingNotificationService] Failed to send payment failed email', {
        email,
        error: result.error,
      })
    }
  }

  /**
   * Send subscription canceled email
   */
  async sendSubscriptionCanceled(params: SubscriptionCanceledParams): Promise<void> {
    const { email, customerName, planName, endDate } = params
    const resubscribeUrl = `${this.baseUrl}/pricing`

    const emailContent = await generateSubscriptionCanceledEmail({
      customerName,
      planName,
      endDate: formatDate(endDate),
      resubscribeUrl,
    })

    const result = await resendProvider.send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!result.success) {
      console.error('[BillingNotificationService] Failed to send subscription canceled email', {
        email,
        error: result.error,
      })
    }
  }

  /**
   * Send invoice email
   */
  async sendInvoice(params: InvoiceParams): Promise<void> {
    const { email, customerName, invoiceNumber, amountCents, dueDate, planName, invoiceUrl } = params

    const emailContent = await generateInvoiceEmail({
      customerName,
      invoiceNumber,
      amount: formatCurrency(amountCents),
      dueDate: formatDate(dueDate),
      planName,
      invoiceUrl,
    })

    const result = await resendProvider.send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!result.success) {
      console.error('[BillingNotificationService] Failed to send invoice email', {
        email,
        error: result.error,
      })
    }
  }
}
