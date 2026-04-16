import { z } from 'zod'
import {
  BILLING_PAYMENT_METHODS,
  BILLING_PLAN_TYPES,
  BILLING_SUBSCRIPTION_STATUSES,
} from '@/types/billing/billing'

const checkoutPlanSchema = z.enum(BILLING_PLAN_TYPES)
const paymentMethodSchema = z.enum(BILLING_PAYMENT_METHODS)

const creditCardSchema = z.object({
  holderName: z.string().trim().min(3, 'Nome no cartão inválido'),
  number: z.string().trim().min(13, 'Número do cartão inválido'),
  expiryMonth: z.string().trim().min(2, 'Mês inválido').max(2, 'Mês inválido'),
  expiryYear: z.string().trim().min(2, 'Ano inválido').max(4, 'Ano inválido'),
  ccv: z.string().trim().min(3, 'CCV inválido').max(4, 'CCV inválido'),
})

export const checkoutRequestSchema = z
  .object({
    planCode: checkoutPlanSchema,
    paymentMethod: paymentMethodSchema.default('CREDIT_CARD'),
    cpfCnpj: z.string().trim().min(11).max(18),
    installments: z.number().int().min(1).max(12).default(1),
    redirectPath: z.string().max(2048).optional(),
    creditCard: creditCardSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.planCode === 'monthly' && value.paymentMethod === 'PIX') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'PIX comum está disponível apenas no anual',
      })
    }

    if (value.planCode === 'annual' && value.paymentMethod === 'PIX_AUTOMATIC') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'PIX automático está disponível apenas no mensal',
      })
    }

    if (value.paymentMethod !== 'CREDIT_CARD' && value.installments !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installments'],
        message: 'Parcelamento disponível apenas no cartão de crédito',
      })
    }

    if (value.planCode === 'monthly' && value.paymentMethod === 'CREDIT_CARD' && value.installments !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installments'],
        message: 'Plano mensal no cartão aceita apenas renovação mensal sem parcelamento',
      })
    }

    if (value.paymentMethod === 'CREDIT_CARD' && !value.creditCard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['creditCard'],
        message: 'Dados do cartão são obrigatórios',
      })
    }
  })

export const checkoutResponseSchema = z.object({
  provider: z.literal('asaas'),
  subscriptionId: z.string(),
  invoiceId: z.string().nullable().optional(),
  status: z.enum(BILLING_SUBSCRIPTION_STATUSES),
  paymentMethod: paymentMethodSchema,
  requiresAction: z.boolean().default(false),
  pix: z
    .object({
      qrCodePayload: z.string(),
      qrCodeImage: z.string().nullable().optional(),
      expirationDate: z.string().datetime().nullable().optional(),
    })
    .nullable()
    .optional(),
  pixAutomatic: z
    .object({
      authorizationId: z.string(),
      qrCodePayload: z.string(),
      qrCodeImage: z.string().nullable().optional(),
      expirationDate: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export const subscriptionResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  planType: checkoutPlanSchema,
  planName: z.string().nullable().optional(),
  status: z.enum(BILLING_SUBSCRIPTION_STATUSES),
  canceledAtPeriodEnd: z.boolean(),
  billingCycleStartDate: z.string().datetime(),
  billingCycleEndDate: z.string().datetime(),
  nextResetDate: z.string().datetime(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  canceledAt: z.string().datetime().nullable().optional(),
  provider: z.literal('asaas').optional(),
  asaasId: z.string().nullable().optional(),
  asaasCustomerId: z.string().nullable().optional(),
  offerCode: z.string().nullable().optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  isActive: z.boolean(),
  purchaseDate: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  failureCount: z.number().int().min(0),
  lastInvoice: z
    .object({
      id: z.string(),
      asaasId: z.string(),
      status: z.string(),
      paymentMethod: paymentMethodSchema,
      value: z.number(),
      dueDate: z.string().datetime(),
      paidAt: z.string().datetime().nullable().optional(),
      invoiceUrl: z.string().nullable().optional(),
      pixQrCodePayload: z.string().nullable().optional(),
      pixQrCodeImage: z.string().nullable().optional(),
      pixExpirationDate: z.string().datetime().nullable().optional(),
    })
    .nullable(),
})

export const cancelRequestSchema = z.object({
  atPeriodEnd: z.boolean().optional().default(false),
})

export const cancelResponseSchema = z.object({
  status: z.enum(BILLING_SUBSCRIPTION_STATUSES),
  canceledAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable().optional(),
})

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>
export type CancelRequest = z.infer<typeof cancelRequestSchema>
export type CancelResponse = z.infer<typeof cancelResponseSchema>
