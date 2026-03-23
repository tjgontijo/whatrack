import { z } from 'zod'
import { AI_EVENT_DIRECTIONS, AI_EVENT_TYPES } from '@/lib/ai/types/event-types'

const metadataSchema = z.record(z.string(), z.unknown()).optional()

const baseEventSchema = z.object({
  organizationId: z.string().uuid().optional(),
  projectId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  agentSlug: z.string().min(1).optional(),
  channel: z.string().min(1).optional(),
  direction: z.enum(AI_EVENT_DIRECTIONS).optional(),
  modelId: z.string().min(1).optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().nonnegative().optional(),
  status: z.string().min(1).default('success'),
  errorMsg: z.string().max(1000).optional(),
})

const messageSentSchema = baseEventSchema.extend({
  type: z.literal('MESSAGE_SENT'),
  metadata: metadataSchema,
})

const templateSentSchema = baseEventSchema.extend({
  type: z.literal('TEMPLATE_SENT'),
  metadata: metadataSchema,
})

const skillExecutedSchema = baseEventSchema.extend({
  type: z.literal('SKILL_EXECUTED'),
  metadata: metadataSchema,
})

const contextUpdatedSchema = baseEventSchema.extend({
  type: z.literal('CONTEXT_UPDATED'),
  metadata: metadataSchema,
})

const cadenceEnrolledSchema = baseEventSchema.extend({
  type: z.literal('CADENCE_ENROLLED'),
  metadata: metadataSchema,
})

const cadenceStepExecutedSchema = baseEventSchema.extend({
  type: z.literal('CADENCE_STEP_EXECUTED'),
  metadata: metadataSchema,
})

const cadenceInterruptedSchema = baseEventSchema.extend({
  type: z.literal('CADENCE_INTERRUPTED'),
  metadata: metadataSchema,
})

const cadenceCompletedSchema = baseEventSchema.extend({
  type: z.literal('CADENCE_COMPLETED'),
  metadata: metadataSchema,
})

const crisisDetectedSchema = baseEventSchema.extend({
  type: z.literal('CRISIS_DETECTED'),
  metadata: metadataSchema,
})

const leadScoredSchema = baseEventSchema.extend({
  type: z.literal('LEAD_SCORED'),
  metadata: metadataSchema,
})

const leadStagedSchema = baseEventSchema.extend({
  type: z.literal('LEAD_STAGED'),
  metadata: metadataSchema,
})

const suggestionMadeSchema = baseEventSchema.extend({
  type: z.literal('SUGGESTION_MADE'),
  metadata: metadataSchema,
})

const triageCompletedSchema = baseEventSchema.extend({
  type: z.literal('TRIAGE_COMPLETED'),
  metadata: metadataSchema,
})

const errorSchema = baseEventSchema.extend({
  type: z.literal('ERROR'),
  metadata: metadataSchema,
})

export const recordAiEventSchema = z.discriminatedUnion('type', [
  messageSentSchema,
  templateSentSchema,
  skillExecutedSchema,
  contextUpdatedSchema,
  cadenceEnrolledSchema,
  cadenceStepExecutedSchema,
  cadenceInterruptedSchema,
  cadenceCompletedSchema,
  crisisDetectedSchema,
  leadScoredSchema,
  leadStagedSchema,
  suggestionMadeSchema,
  triageCompletedSchema,
  errorSchema,
])

export const aiEventTypeSchema = z.enum(AI_EVENT_TYPES)

export type RecordAiEventInput = z.infer<typeof recordAiEventSchema>
