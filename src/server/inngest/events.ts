import { z } from 'zod'

export const whatsappMessageReceivedDataSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  debounceMs: z.number().int().positive().max(60000).optional(),
})

export const aiEventRecordedDataSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid(),
  type: z.string().min(1),
})

export const aiPromptRequestedDataSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  agentSlug: z.string().min(1),
  leadId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
})

export const aiCadenceTickDataSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  cadenceId: z.string().uuid(),
  enrollmentId: z.string().uuid().optional(),
})

export const aiInngestEventSchemas = {
  'whatsapp/message.received': whatsappMessageReceivedDataSchema,
  'ai.event.recorded': aiEventRecordedDataSchema,
  'ai.prompt.requested': aiPromptRequestedDataSchema,
  'ai.cadence.tick': aiCadenceTickDataSchema,
} as const

export type AiInngestEventName = keyof typeof aiInngestEventSchemas

export type AiInngestEventPayload =
  | {
      name: 'whatsapp/message.received'
      data: z.infer<typeof whatsappMessageReceivedDataSchema>
    }
  | {
      name: 'ai.event.recorded'
      data: z.infer<typeof aiEventRecordedDataSchema>
    }
  | {
      name: 'ai.prompt.requested'
      data: z.infer<typeof aiPromptRequestedDataSchema>
    }
  | {
      name: 'ai.cadence.tick'
      data: z.infer<typeof aiCadenceTickDataSchema>
    }
