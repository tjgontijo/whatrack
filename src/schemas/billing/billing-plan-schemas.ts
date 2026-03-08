import { z } from 'zod'

export const billingPlanSyncStatuses = ['pending', 'synced', 'error'] as const
export const billingPlanSupportLevels = ['email', 'priority', 'dedicated'] as const

export const billingPlanMetadataSchema = z.object({
  subtitle: z.string().trim().max(160).nullable().optional(),
  cta: z.string().trim().max(80).nullable().optional(),
  trialDays: z.number().int().min(0).max(30).optional(),
  features: z.array(z.string().trim().min(1).max(160)).max(12).optional(),
  additionals: z.array(z.string().trim().min(1).max(160)).max(12).optional(),
})

export const billingPlanListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  query: z.string().trim().max(120).optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  syncStatus: z.enum(['all', ...billingPlanSyncStatuses]).default('all'),
})

const billingPlanBaseSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  description: z.string().trim().max(280).nullable().optional(),
  monthlyPrice: z.coerce.number().min(0).max(999999),
  currency: z.string().trim().min(3).max(3).default('BRL'),
  eventLimitPerMonth: z.coerce.number().int().min(0).max(999999),
  overagePricePerEvent: z.coerce.number().min(0).max(9999),
  maxWhatsAppNumbers: z.coerce.number().int().min(0).max(999),
  maxAdAccounts: z.coerce.number().int().min(0).max(999),
  maxTeamMembers: z.coerce.number().int().min(1).max(9999),
  supportLevel: z.enum(billingPlanSupportLevels),
  displayOrder: z.coerce.number().int().min(0).max(999),
  isHighlighted: z.boolean().default(false),
  contactSalesOnly: z.boolean().default(false),
  trialDays: z.coerce.number().int().min(0).max(30).default(7),
  subtitle: z.string().trim().max(160).nullable().optional(),
  cta: z.string().trim().max(80).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
  additionals: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
})

export const billingPlanCreateSchema = billingPlanBaseSchema.extend({
  isActive: z.boolean().default(true),
})

export const billingPlanUpdateSchema = billingPlanBaseSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const billingPlanArchiveSchema = z.object({
  archived: z.literal(true).default(true),
})

export const billingPlanSyncSchema = z.object({
  forceNewPrice: z.boolean().optional().default(false),
})

export const billingPlanPublicQuerySchema = z.object({
  selfServeOnly: z.coerce.boolean().optional().default(false),
})

export const billingPlanHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const billingPlanListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  subtitle: z.string().nullable(),
  cta: z.string().nullable(),
  trialDays: z.number().int().min(0),
  features: z.array(z.string()),
  additionals: z.array(z.string()),
  monthlyPrice: z.string(),
  currency: z.string(),
  eventLimitPerMonth: z.number().int(),
  overagePricePerEvent: z.string(),
  maxWhatsAppNumbers: z.number().int(),
  maxAdAccounts: z.number().int(),
  maxTeamMembers: z.number().int(),
  supportLevel: z.string(),
  stripeProductId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  syncStatus: z.enum(billingPlanSyncStatuses),
  syncError: z.string().nullable(),
  syncedAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
  isHighlighted: z.boolean(),
  contactSalesOnly: z.boolean(),
  displayOrder: z.number().int(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  subscriptionCount: z.number().int(),
})

export const billingPlanDetailSchema = billingPlanListItemSchema

export const billingPlanListResponseSchema = z.object({
  items: z.array(billingPlanListItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
})

export const billingPlanHistoryItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  createdAt: z.string().datetime(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
    })
    .nullable(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  metadata: z.unknown().optional(),
})

export const billingPlanHistoryResponseSchema = z.object({
  items: z.array(billingPlanHistoryItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
})

export const publicBillingPlanSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  subtitle: z.string().nullable(),
  cta: z.string(),
  trialDays: z.number().int().min(0),
  features: z.array(z.string()),
  additionals: z.array(z.string()),
  monthlyPrice: z.number(),
  currency: z.string(),
  eventLimitPerMonth: z.number().int(),
  overagePricePerEvent: z.number(),
  maxWhatsAppNumbers: z.number().int(),
  maxAdAccounts: z.number().int(),
  maxTeamMembers: z.number().int(),
  supportLevel: z.string(),
  isHighlighted: z.boolean(),
  contactSalesOnly: z.boolean(),
  displayOrder: z.number().int(),
  syncStatus: z.enum(billingPlanSyncStatuses),
  stripePriceId: z.string().nullable(),
})

export const publicBillingPlanListResponseSchema = z.object({
  items: z.array(publicBillingPlanSchema),
})

export type BillingPlanMetadata = z.infer<typeof billingPlanMetadataSchema>
export type BillingPlanListQuery = z.infer<typeof billingPlanListQuerySchema>
export type BillingPlanCreateInput = z.infer<typeof billingPlanCreateSchema>
export type BillingPlanUpdateInput = z.infer<typeof billingPlanUpdateSchema>
export type BillingPlanArchiveInput = z.infer<typeof billingPlanArchiveSchema>
export type BillingPlanSyncInput = z.infer<typeof billingPlanSyncSchema>
export type BillingPlanHistoryQuery = z.infer<typeof billingPlanHistoryQuerySchema>
export type BillingPlanListItem = z.infer<typeof billingPlanListItemSchema>
export type BillingPlanDetail = z.infer<typeof billingPlanDetailSchema>
export type BillingPlanListResponse = z.infer<typeof billingPlanListResponseSchema>
export type BillingPlanHistoryItem = z.infer<typeof billingPlanHistoryItemSchema>
export type BillingPlanHistoryResponse = z.infer<typeof billingPlanHistoryResponseSchema>
export type PublicBillingPlan = z.infer<typeof publicBillingPlanSchema>
export type PublicBillingPlanListResponse = z.infer<typeof publicBillingPlanListResponseSchema>
