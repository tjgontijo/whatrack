import { z } from 'zod'

// ============================================
// CHECKOUT SCHEMAS
// ============================================

export const checkoutSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  interval: z.enum(['monthly', 'yearly']),
  billingType: z.enum(['credit_card', 'pix', 'boleto']),
  cardToken: z.string().optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

// ============================================
// SUBSCRIPTION SCHEMAS
// ============================================

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
})

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>

export const changePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  interval: z.enum(['monthly', 'yearly']).optional(),
})

export type ChangePlanInput = z.infer<typeof changePlanSchema>

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const updateCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().default('BR'),
    })
    .optional(),
})

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

// ============================================
// INVOICE SCHEMAS
// ============================================

export const listInvoicesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
})

export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>

// ============================================
// PAYMENT METHOD SCHEMAS
// ============================================

export const addPaymentMethodSchema = z.object({
  cardNumber: z.string().min(13).max(19),
  cardHolder: z.string().min(3),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid month (01-12)'),
  expiryYear: z.string().regex(/^\d{4}$/, 'Invalid year (YYYY)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
  setDefault: z.boolean().default(false),
})

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>

// ============================================
// PLANS SCHEMAS (public, no auth)
// ============================================

export const listPlansSchema = z.object({
  currency: z.string().default('BRL'),
  interval: z.enum(['monthly', 'yearly']).optional(),
})

export type ListPlansInput = z.infer<typeof listPlansSchema>

// ============================================
// COMMON RESPONSE TYPES
// ============================================

export interface ApiErrorResponse {
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
