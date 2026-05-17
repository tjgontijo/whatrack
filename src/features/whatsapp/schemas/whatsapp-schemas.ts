import { z } from 'zod'

export const whatsappChatsQuerySchema = z.object({
  q: z.string().optional(),
  instanceId: z.string().optional(),
})

export const whatsappChatMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export const whatsappSendTemplateSchema = z.object({
  to: z.string().min(1),
  templateName: z.string().min(1),
  language: z.string().min(1).default('pt_BR'),
  variables: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
})

export const whatsappManualSendTemplateSchema = whatsappSendTemplateSchema.extend({
  configId: z.string().min(1),
})

export const whatsappWebhookVerifySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string().min(1),
  'hub.challenge': z.string().min(1),
})

export const whatsappDisconnectSchema = z.object({
  configId: z.string().min(1),
})

export const whatsappInstanceProjectUpdateSchema = z.object({
  configId: z.string().min(1),
  projectId: z.string().trim().min(1).nullable(),
})

export type WhatsAppChatsQueryInput = z.infer<typeof whatsappChatsQuerySchema>
export type WhatsAppChatMessagesQueryInput = z.infer<typeof whatsappChatMessagesQuerySchema>
export type WhatsAppSendTemplateInput = z.infer<typeof whatsappSendTemplateSchema>
export type WhatsAppManualSendTemplateInput = z.infer<typeof whatsappManualSendTemplateSchema>
export type WhatsAppDisconnectInput = z.infer<typeof whatsappDisconnectSchema>
export type WhatsAppInstanceProjectUpdateInput = z.infer<typeof whatsappInstanceProjectUpdateSchema>
