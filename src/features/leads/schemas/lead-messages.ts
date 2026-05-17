import { z } from 'zod'

export const leadMessageAuthorSchema = z.object({
  role: z.enum(['lead', 'team', 'bot']).default('team'),
  number: z.string().nullable(),
})

export const leadMessageSchema = z.object({
  id: z.string(),
  message_id: z.string().nullable(),
  lead_id: z.string(),
  type: z.string().nullable(),
  body: z.string().nullable(),
  author: leadMessageAuthorSchema,
  sent_at: z.string().nullable(),
  raw_payload: z.unknown().nullable(),
})

export const leadMessagesResponseSchema = z.object({
  lead: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    createdAt: z.string(),
  }),
  messages: z.array(leadMessageSchema),
})

export type LeadMessageAuthor = z.infer<typeof leadMessageAuthorSchema>
export type LeadMessage = z.infer<typeof leadMessageSchema>
export type LeadMessagesResponse = z.infer<typeof leadMessagesResponseSchema>
