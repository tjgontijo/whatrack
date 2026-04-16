import type { CheckoutRequest } from '@/schemas/billing/billing-schemas'
import { BillingPaymentService } from './payment.service'

export class BillingCheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'BillingCheckoutError'
  }
}

export interface CreateCheckoutSessionParams {
  organizationId: string
  userId: string
  input: CheckoutRequest
  remoteIp?: string
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  try {
    if (params.input.paymentMethod === 'PIX_AUTOMATIC') {
      return BillingPaymentService.createPixAutomaticCheckout({
        organizationId: params.organizationId,
        userId: params.userId,
        cpfCnpj: params.input.cpfCnpj,
        planCode: 'monthly',
      })
    }

    if (params.input.paymentMethod === 'PIX') {
      return BillingPaymentService.createPixCheckout({
        organizationId: params.organizationId,
        userId: params.userId,
        cpfCnpj: params.input.cpfCnpj,
        planCode: 'annual',
      })
    }

    if (!params.input.creditCard) {
      throw new BillingCheckoutError('Dados do cartão são obrigatórios', 400)
    }

    return BillingPaymentService.createCreditCardCheckout({
      organizationId: params.organizationId,
      userId: params.userId,
      cpfCnpj: params.input.cpfCnpj,
      planCode: params.input.planCode,
      installments: params.input.installments,
      remoteIp: params.remoteIp,
      creditCard: params.input.creditCard,
    })
  } catch (error) {
    if (error instanceof BillingCheckoutError) {
      throw error
    }

    throw new BillingCheckoutError(
      error instanceof Error ? error.message : 'Erro ao iniciar checkout',
      500,
    )
  }
}
