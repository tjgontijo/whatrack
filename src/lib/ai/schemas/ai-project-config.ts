import { z } from 'zod'

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/)

export const aiProjectBusinessHoursSchema = z
  .object({
    timezone: z.string().min(1),
    schedules: z
      .array(
        z.object({
          day: z.number().int().min(0).max(6),
          open: timeStringSchema,
          close: timeStringSchema,
        })
      )
      .max(7),
  })
  .strict()

export const aiProjectConfigQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
})

export const aiProjectConfigUpdateSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    blueprintSlug: z.string().min(1).max(120).optional(),
    businessName: z.string().max(160).nullable().optional(),
    niche: z.string().max(160).nullable().optional(),
    productDescription: z.string().max(4000).nullable().optional(),
    pricingInfo: z.string().max(2000).nullable().optional(),
    nextStepType: z.string().max(160).nullable().optional(),
    assistantName: z.string().max(120).nullable().optional(),
    escalationContact: z.string().max(200).nullable().optional(),
    businessHours: aiProjectBusinessHoursSchema.nullable().optional(),
    debounceMs: z.number().int().min(1000).max(30000).optional(),
    testingModeEnabled: z.boolean().optional(),
    testingPhones: z.array(z.string().min(5).max(40)).max(50).optional(),
    inboundAgent: z
      .object({
        enabled: z.boolean().optional(),
        paused: z.boolean().optional(),
      })
      .optional(),
  })
  .strict()

export type AiProjectConfigQuery = z.infer<typeof aiProjectConfigQuerySchema>
export type AiProjectConfigUpdateInput = z.infer<typeof aiProjectConfigUpdateSchema>
