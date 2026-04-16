import { BillingFailureReason } from '@prisma/client'

const FAILURE_REASON_VALUES = {
  EXPIRED: 'EXPIRED',
  DENIED: 'DENIED',
  CANCELED_BY_USER: 'CANCELED_BY_USER',
  FAILED_DEBIT: 'FAILED_DEBIT',
  OTHER: 'OTHER',
} as const

export function mapPixAutomaticFailureReason(
  eventName: string,
  errorMessage?: string | null,
): BillingFailureReason {
  if (
    eventName === 'PIX_AUTOMATIC_AUTHORIZATION_DENIED' ||
    eventName === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED'
  ) {
    return 'DENIED'
  }

  if (
    eventName === 'PIX_AUTOMATIC_AUTHORIZATION_EXPIRED' ||
    eventName === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED'
  ) {
    return 'EXPIRED'
  }

  if (
    eventName === 'PIX_AUTOMATIC_AUTHORIZATION_CANCELED' ||
    eventName === 'PIX_AUTOMATIC_AUTHORIZATION_CANCELLED' ||
    eventName === 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED'
  ) {
    return 'CANCELED_BY_USER'
  }

  if (errorMessage?.includes('declined') || errorMessage?.includes('recusado')) {
    return 'DENIED'
  }

  if (errorMessage?.includes('expirado') || errorMessage?.includes('expired')) {
    return 'EXPIRED'
  }

  if (
    errorMessage?.includes('cancelado') ||
    errorMessage?.includes('cancelled') ||
    errorMessage?.includes('cancelled')
  ) {
    return 'CANCELED_BY_USER'
  }

  if (errorMessage?.includes('debit') || errorMessage?.includes('débito')) {
    return 'FAILED_DEBIT'
  }

  return 'OTHER'
}

export function getPixFailureMessage(reason: BillingFailureReason): string {
  const messages: Record<BillingFailureReason, string> = {
    EXPIRED: 'Sua autorização PIX Automático expirou. Por favor, tente novamente.',
    DENIED:
      'Sua autorização PIX Automático foi recusada. Verifique seus dados bancários e tente novamente.',
    CANCELED_BY_USER:
      'Você cancelou a autorização PIX Automático. Configure um novo método de pagamento.',
    FAILED_DEBIT: 'Não conseguimos debitar sua conta. Verifique o saldo e tente novamente.',
    OTHER: 'Ocorreu um erro ao processar sua autorização. Entre em contato com o suporte.',
  }

  return messages[reason] || messages['OTHER']
}

export function calculateNextRetryDate(failureCount: number): Date {
  const now = new Date()

  // Exponential backoff: 1h, 6h, 24h, then 24h
  const delays = [
    1 * 60 * 60 * 1000, // 1 hour
    6 * 60 * 60 * 1000, // 6 hours
    24 * 60 * 60 * 1000, // 24 hours
  ]

  const delayMs = delays[Math.min(failureCount - 1, delays.length - 1)]
  return new Date(now.getTime() + delayMs)
}

export function shouldAutoCancel(
  failureCount: number,
  lastFailureAt: Date | null | undefined,
): boolean {
  if (failureCount < 3) {
    return false
  }

  if (!lastFailureAt) {
    return false
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return lastFailureAt > thirtyDaysAgo
}
