import { z } from 'zod'

const aiAgentTriggerSchema = z.object({
  eventType: z.string().min(1),
  conditions: z.record(z.string(), z.unknown()).optional(),
})

const aiAgentSchemaFieldSchema = z.object({
  fieldName: z.string().min(1),
  fieldType: z.string().min(1),
  description: z.string().min(1),
  isRequired: z.boolean().optional(),
  options: z.unknown().optional().nullable(),
})

export const createAiAgentSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  systemPrompt: z.string().min(1),
  model: z.string().optional(),
  isActive: z.boolean().optional(),
  triggers: z.array(aiAgentTriggerSchema).optional(),
  schemaFields: z.array(aiAgentSchemaFieldSchema).optional(),
})

export const updateAiAgentSchema = createAiAgentSchema.partial()

export const aiInsightsQuerySchema = z.object({
  status: z.string().default('SUGGESTION'),
})

export const approveAiInsightSchema = z.object({
  itemId: z.string().uuid().optional(),
  newItem: z
    .object({
      name: z.string().min(1),
      categoryId: z.string().uuid().optional(),
      newCategoryName: z.string().min(1).optional(),
    })
    .optional(),
})

export type CreateAiAgentInput = z.infer<typeof createAiAgentSchema>
export type UpdateAiAgentInput = z.infer<typeof updateAiAgentSchema>
export type AiInsightsQueryInput = z.infer<typeof aiInsightsQuerySchema>
export type ApproveAiInsightInput = z.infer<typeof approveAiInsightSchema>
