import { z } from 'zod'
import type { BillingProvider, PlanInterval, PaymentMethod, PaymentStatus, SubscriptionStatus } from '@prisma/client'

// ============================================
// ADDRESS SCHEMA
// ============================================

export const AddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('BR'),
})

export type Address = z.infer<typeof AddressSchema>

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const CreateCustomerParamsSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  taxId: z.string().optional(), // CPF or CNPJ
  phone: z.string().optional(),
  address: AddressSchema.optional(),
})

export type CreateCustomerParams = z.infer<typeof CreateCustomerParamsSchema>

export const UpdateCustomerParamsSchema = CreateCustomerParamsSchema.partial()

export type UpdateCustomerParams = z.infer<typeof UpdateCustomerParamsSchema>

export const CreateCustomerResultSchema = z.object({
  externalId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCustomerResult = z.infer<typeof CreateCustomerResultSchema>

// ============================================
// SUBSCRIPTION SCHEMAS
// ============================================

export const BillingTypeSchema = z.enum(['credit_card', 'pix', 'boleto'])
export type BillingType = z.infer<typeof BillingTypeSchema>

export const IntervalSchema = z.enum(['monthly', 'yearly'])
export type Interval = z.infer<typeof IntervalSchema>

export const CreateSubscriptionParamsSchema = z.object({
  customerId: z.string(),
  planId: z.string(),
  interval: IntervalSchema,
  paymentMethodToken: z.string().optional(),
  billingType: BillingTypeSchema,
  couponCode: z.string().optional(),
})

export type CreateSubscriptionParams = z.infer<typeof CreateSubscriptionParamsSchema>

export const PaymentDataSchema = z.object({
  pixQrCode: z.string().optional(),
  pixCopyPaste: z.string().optional(),
  pixExpiresAt: z.date().optional(),
  boletoUrl: z.string().optional(),
  boletoBarcode: z.string().optional(),
  boletoDueDate: z.date().optional(),
})

export type PaymentData = z.infer<typeof PaymentDataSchema>

export const CreateSubscriptionResultSchema = z.object({
  externalId: z.string(),
  status: z.string(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  paymentData: PaymentDataSchema.optional(),
})

export type CreateSubscriptionResult = z.infer<typeof CreateSubscriptionResultSchema>

export const CancelSubscriptionParamsSchema = z.object({
  externalId: z.string(),
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().optional(),
})

export type CancelSubscriptionParams = z.infer<typeof CancelSubscriptionParamsSchema>

export const SubscriptionResultSchema = z.object({
  externalId: z.string(),
  status: z.string(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.date().nullable(),
})

export type SubscriptionResult = z.infer<typeof SubscriptionResultSchema>

// ============================================
// CARD TOKENIZATION SCHEMAS
// ============================================

export const TokenizeCardParamsSchema = z.object({
  cardNumber: z.string().min(13).max(19),
  cardHolder: z.string().min(2),
  expiryMonth: z.string().length(2),
  expiryYear: z.string().min(2).max(4),
  cvv: z.string().min(3).max(4),
  customerId: z.string(),
})

export type TokenizeCardParams = z.infer<typeof TokenizeCardParamsSchema>

export const TokenizeCardResultSchema = z.object({
  token: z.string(),
  brand: z.string(),
  last4: z.string().length(4),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2024),
})

export type TokenizeCardResult = z.infer<typeof TokenizeCardResultSchema>

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const PaymentResultSchema = z.object({
  externalId: z.string(),
  status: z.string(),
  amountCents: z.number(),
  currency: z.string().default('BRL'),
  method: z.string().nullable(),
  paidAt: z.date().nullable(),
  failedAt: z.date().nullable(),
  failureReason: z.string().nullable(),
  paymentData: PaymentDataSchema.optional(),
})

export type PaymentResult = z.infer<typeof PaymentResultSchema>

export const RefundParamsSchema = z.object({
  externalId: z.string(),
  amountCents: z.number().optional(), // If not provided, full refund
  reason: z.string().optional(),
})

export type RefundParams = z.infer<typeof RefundParamsSchema>

export const RefundResultSchema = z.object({
  externalId: z.string(),
  status: z.string(),
  amountCents: z.number(),
  refundedAt: z.date().nullable(),
})

export type RefundResult = z.infer<typeof RefundResultSchema>

// ============================================
// INVOICE SCHEMAS
// ============================================

export const InvoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().default(1),
  unitCents: z.number(),
  totalCents: z.number(),
})

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>

export const InvoiceResultSchema = z.object({
  externalId: z.string(),
  status: z.string(),
  subtotalCents: z.number(),
  discountCents: z.number().default(0),
  taxCents: z.number().default(0),
  totalCents: z.number(),
  currency: z.string().default('BRL'),
  dueDate: z.date().nullable(),
  paidAt: z.date().nullable(),
  items: z.array(InvoiceItemSchema),
  paymentData: PaymentDataSchema.optional(),
})

export type InvoiceResult = z.infer<typeof InvoiceResultSchema>

// ============================================
// WEBHOOK SCHEMAS
// ============================================

export const WebhookEventSchema = z.object({
  provider: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
})

export type WebhookEvent = z.infer<typeof WebhookEventSchema>

export const WebhookValidationResultSchema = z.object({
  isValid: z.boolean(),
  event: WebhookEventSchema.optional(),
  error: z.string().optional(),
})

export type WebhookValidationResult = z.infer<typeof WebhookValidationResultSchema>

// ============================================
// RE-EXPORT PRISMA TYPES FOR CONVENIENCE
// ============================================

export type {
  BillingProvider,
  PlanInterval,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
}
