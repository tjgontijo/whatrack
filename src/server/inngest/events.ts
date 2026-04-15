import { z } from 'zod'

export const whatsappCampaignDispatchDataSchema = z.object({
  organizationId: z.string().uuid(),
  campaignId: z.string().uuid(),
  immediate: z.boolean().default(true),
  scheduledAt: z.string().datetime().nullable().optional(),
})

export const inngestEventSchemas = {
  'whatsapp/campaign.dispatch': whatsappCampaignDispatchDataSchema,
} as const

export type InngestEventName = keyof typeof inngestEventSchemas

export type InngestEventPayload = {
  name: 'whatsapp/campaign.dispatch'
  data: z.infer<typeof whatsappCampaignDispatchDataSchema>
}
