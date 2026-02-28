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
  planType: z.enum(['starter', 'pro', 'agency']),
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
  status: z.enum(['active', 'paused', 'canceled', 'past_due']),
  billingCycleStartDate: z.string().datetime(),
  billingCycleEndDate: z.string().datetime(),
  nextResetDate: z.string().datetime(),
  eventLimitPerMonth: z.number(),
  eventsUsedInCurrentCycle: z.number(),
  createdAt: z.string().datetime(),
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
  status: z.string(),
  canceledAt: z.string().datetime().optional(),
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
