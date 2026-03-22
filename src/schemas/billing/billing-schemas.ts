import { z } from 'zod'

export const checkoutRequestSchema = z.object({
  planType: z.literal('platform_base'),
  redirectPath: z.string().max(2048).optional(),
})

export const checkoutResponseSchema = z.object({
  url: z.string().url(),
  provider: z.string(),
})

export const subscriptionItemSchema = z.object({
  planSlug: z.string(),
  planName: z.string(),
  kind: z.enum(['base', 'addon']),
  addonType: z.enum(['project', 'whatsapp_number', 'meta_ad_account']).nullable(),
  quantity: z.number().int().min(0),
  unitPrice: z.number(),
  currency: z.string(),
})

export const entitlementSummarySchema = z.object({
  includedProjects: z.number().int().min(0),
  activeProjects: z.number().int().min(0),
  additionalProjects: z.number().int().min(0),
  includedWhatsAppPerProject: z.number().int().min(0),
  additionalWhatsAppNumbers: z.number().int().min(0),
  includedMetaAdAccountsPerProject: z.number().int().min(0),
  additionalMetaAdAccounts: z.number().int().min(0),
  includedConversionsPerProject: z.number().int().min(0),
})

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
  trialEndsAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  canceledAt: z.string().datetime().nullable().optional(),
  provider: z.string().optional(),
  providerSubscriptionId: z.string().nullable().optional(),
  items: z.array(subscriptionItemSchema),
  entitlements: entitlementSummarySchema,
})

export const cancelRequestSchema = z.object({
  atPeriodEnd: z.boolean().optional().default(false),
})

export const cancelResponseSchema = z.object({
  status: z.enum(['active', 'paused', 'canceled', 'past_due']),
  canceledAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable().optional(),
})

export const portalRequestSchema = z.object({
  returnUrl: z.string().max(2048).optional(),
})

export const portalResponseSchema = z.object({
  url: z.string().url(),
})

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>
export type CancelRequest = z.infer<typeof cancelRequestSchema>
export type CancelResponse = z.infer<typeof cancelResponseSchema>
export type PortalRequest = z.infer<typeof portalRequestSchema>
export type PortalResponse = z.infer<typeof portalResponseSchema>
