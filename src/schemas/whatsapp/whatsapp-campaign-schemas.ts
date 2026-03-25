import { z } from 'zod'

function isScientificNotationPhone(value: string): boolean {
  return /(^|[^\w])\d+(?:[.,]\d+)?e[+-]?\d+($|[^\w])/i.test(value.trim())
}

function isValidCampaignPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || isScientificNotationPhone(trimmed)) {
    return false
  }

  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 10
}

const campaignPhoneSchema = z
  .string()
  .min(1)
  .refine((value) => isValidCampaignPhone(value), 'Telefone inválido. Use a coluna formatada como texto no CSV.')

export const whatsappCampaignTypeSchema = z.enum(['MARKETING', 'OPERATIONAL'])
export const campaignStatusSchema = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SCHEDULED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
])
export const recipientStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'EXCLUDED',
  'RESPONDED',
])
export const dispatchGroupStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
])

export const dispatchGroupSchema = z.object({
  configId: z.string().uuid(),
  templateName: z.string().min(1),
  templateLang: z.string().min(1).default('pt_BR'),
  variables: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  order: z.number().int().min(0).default(0),
})

export const whatsappCampaignCreateSchema = z.object({
  name: z.string().min(1).max(255),
  type: whatsappCampaignTypeSchema.default('MARKETING'),
  projectId: z.string().uuid(),
  templateName: z.string().min(1).optional(),
  templateLang: z.string().min(1).default('pt_BR'),
  scheduledAt: z.string().datetime().optional().nullable(),
  shouldCreateLeads: z.boolean().default(true),
  audienceSourceType: z.enum(['LIST', 'SEGMENT']).optional(),
  audienceSourceId: z.string().uuid().optional(),
  dispatchGroups: z.array(dispatchGroupSchema).optional(),
})

export const whatsappCampaignUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: whatsappCampaignTypeSchema.optional(),
  templateName: z.string().min(1).optional(),
  templateLang: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  shouldCreateLeads: z.boolean().optional(),
  audienceSourceType: z.enum(['LIST', 'SEGMENT']).optional(),
  audienceSourceId: z.string().uuid().optional(),
  dispatchGroups: z.array(dispatchGroupSchema).optional(),
})

export const whatsappCampaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  projectId: z.string().uuid().optional(),
  status: campaignStatusSchema.optional(),
  type: whatsappCampaignTypeSchema.optional(),
})

export const whatsappCampaignApproveSchema = z.object({
  comment: z.string().max(1000).optional(),
})

export const whatsappCampaignDispatchSchema = z.object({
  immediate: z.boolean().default(true),
  scheduledAt: z.string().datetime().optional(),
})

export const whatsappCampaignCancelSchema = z.object({
  comment: z.string().max(1000).optional(),
})

export const whatsappCampaignImportSchema = z.object({
  campaignId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        phone: campaignPhoneSchema,
        variables: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
      })
    )
    .min(1),
})

export type WhatsAppCampaignType = z.infer<typeof whatsappCampaignTypeSchema>
export type CampaignStatus = z.infer<typeof campaignStatusSchema>
export type RecipientStatus = z.infer<typeof recipientStatusSchema>
export type DispatchGroupStatus = z.infer<typeof dispatchGroupStatusSchema>
export type WhatsAppCampaignCreateInput = z.infer<typeof whatsappCampaignCreateSchema>
export type WhatsAppCampaignUpdateInput = z.infer<typeof whatsappCampaignUpdateSchema>
export type WhatsAppCampaignListQuery = z.infer<typeof whatsappCampaignListQuerySchema>
export type WhatsAppCampaignApproveInput = z.infer<typeof whatsappCampaignApproveSchema>
export type WhatsAppCampaignDispatchInput = z.infer<typeof whatsappCampaignDispatchSchema>
export type WhatsAppCampaignCancelInput = z.infer<typeof whatsappCampaignCancelSchema>
