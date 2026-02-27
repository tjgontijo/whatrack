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

export const agentSkillBindingSchema = z.object({
  skillId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean().optional(),
})

const agentSkillBindingsSchema = z
  .array(agentSkillBindingSchema)
  .superRefine((bindings, ctx) => {
    const seen = new Set<string>()
    for (const [index, binding] of bindings.entries()) {
      if (seen.has(binding.skillId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'skillBindings contém skill duplicada.',
          path: [index, 'skillId'],
        })
      }
      seen.add(binding.skillId)
    }
  })

export const createAiAgentSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  leanPrompt: z.string().min(1),
  model: z.string().optional(),
  isActive: z.boolean().optional(),
  triggers: z.array(aiAgentTriggerSchema).optional(),
  schemaFields: z.array(aiAgentSchemaFieldSchema).optional(),
  skillBindings: agentSkillBindingsSchema.optional(),
})

export const updateAiAgentSchema = createAiAgentSchema.partial()

export const createAiSkillSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen.'),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
  kind: z.enum(['SHARED', 'AGENT']),
  isActive: z.boolean().optional(),
})

export const updateAiSkillSchema = createAiSkillSchema
  .partial()
  .extend({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen.')
      .optional(),
  })

export const aiResourceIdParamSchema = z.object({
  id: z.string().uuid(),
})

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
export type AgentSkillBindingInput = z.infer<typeof agentSkillBindingSchema>
export type CreateAiSkillInput = z.infer<typeof createAiSkillSchema>
export type UpdateAiSkillInput = z.infer<typeof updateAiSkillSchema>
export type AiInsightsQueryInput = z.infer<typeof aiInsightsQuerySchema>
export type ApproveAiInsightInput = z.infer<typeof approveAiInsightSchema>
