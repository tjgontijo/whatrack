/**
 * Billing Domain Zod Schemas
 *
 * Validates all billing-related requests and responses.
 */

import { z } from 'zod'

// ============================================
// Checkout Schemas
// ============================================

export const checkoutRequestSchema = z.object({
  planType: z.string().trim().min(1).max(60),
  redirectPath: z.string().max(2048).optional(),
})

export const checkoutResponseSchema = z.object({
  url: z.string().url(),
  provider: z.string(),
})

// ============================================
// Subscription Schemas
// ============================================

export const subscriptionResponseSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  planType: z.string(),
  planName: z.string().nullable().optional(),
  status: z.enum(['active', 'paused', 'canceled', 'past_due']),
  canceledAtPeriodEnd: z.boolean(),
  billingCycleStartDate: z.string().datetime(),
  billingCycleEndDate: z.string().datetime(),
  nextResetDate: z.string().datetime(),
  eventLimitPerMonth: z.number(),
  eventsUsedInCurrentCycle: z.number(),
  createdAt: z.string().datetime(),
  canceledAt: z.string().datetime().nullable().optional(),
  provider: z.string().optional(),
  providerSubscriptionId: z.string().optional(),
})

// ============================================
// Usage Schemas
// ============================================

export const usageResponseSchema = z.object({
  used: z.number().int().min(0),
  limit: z.number().int().min(1),
  overage: z.number().min(0),
  nextResetDate: z.string().datetime(),
})

// ============================================
// Event Recording Schemas
// ============================================

export const eventRecordingRequestSchema = z.object({
  eventType: z.enum(['lead_qualified', 'purchase_confirmed']),
  externalId: z.string().optional(),
})

export const eventRecordingResponseSchema = z.object({
  recorded: z.boolean(),
  timestamp: z.string().datetime(),
})

// ============================================
// Cancel Schemas
// ============================================

export const cancelRequestSchema = z.object({
  atPeriodEnd: z.boolean().optional().default(false),
})

export const cancelResponseSchema = z.object({
  status: z.enum(['active', 'paused', 'canceled', 'past_due']),
  canceledAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable().optional(),
})

// ============================================
// Portal Schemas
// ============================================

export const portalRequestSchema = z.object({
  returnUrl: z.string().max(2048).optional(),
})

export const portalResponseSchema = z.object({
  url: z.string().url(),
})

// ============================================
// Webhook Schemas
// ============================================

const paymentWebhookEventSchema = z.enum(['billing.paid', 'pix.paid', 'pix.expired'])

export const billingWebhookPayloadSchema = z
  .object({
    id: z.string().min(1),
    type: paymentWebhookEventSchema.optional(),
    event: paymentWebhookEventSchema.optional(),
    timestamp: z.string().datetime().optional(),
    data: z
      .object({
        billing: z
          .object({
            id: z.string().min(1),
            status: z.string().min(1),
            amount: z.number(),
            products: z
              .array(
                z.object({
                  externalId: z.string().min(1),
                  name: z.string().min(1),
                }),
              )
              .optional(),
            customer: z
              .object({
                id: z.string().min(1),
              })
              .optional(),
          })
          .optional(),
        pixQrCode: z
          .object({
            id: z.string().min(1),
            status: z.string().min(1),
            amount: z.number(),
          })
          .optional(),
      })
      .passthrough(),
  })
  .refine((payload) => Boolean(payload.type || payload.event), {
    message: 'Webhook event type is required',
    path: ['event'],
  })

// ============================================
// Type Inference
// ============================================

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>
export type UsageResponse = z.infer<typeof usageResponseSchema>
export type EventRecordingRequest = z.infer<typeof eventRecordingRequestSchema>
export type EventRecordingResponse = z.infer<typeof eventRecordingResponseSchema>
export type CancelRequest = z.infer<typeof cancelRequestSchema>
export type CancelResponse = z.infer<typeof cancelResponseSchema>
export type PortalRequest = z.infer<typeof portalRequestSchema>
export type PortalResponse = z.infer<typeof portalResponseSchema>
export type BillingWebhookPayload = z.infer<typeof billingWebhookPayloadSchema>
