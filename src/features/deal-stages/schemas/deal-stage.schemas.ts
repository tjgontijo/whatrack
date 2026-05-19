import { z } from 'zod'

export const createDealStageSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use formato hex #RRGGBB)'),
  order: z.number().int().nonnegative().optional(),
  projectId: z.string().uuid().optional(),
  statusGroup: z.enum(['ACTIVE', 'WON', 'LOST']).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  suggestedMetaEventName: z.string().max(50).optional().nullable(),
})

export const updateDealStageSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')
    .optional(),
  isDefault: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  projectId: z.string().uuid().optional(),
  statusGroup: z.enum(['ACTIVE', 'WON', 'LOST']).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  suggestedMetaEventName: z.string().max(50).optional().nullable(),
})

export const reorderDealStageSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
  projectId: z.string().uuid().optional(),
})

export type CreateDealStageInput = z.infer<typeof createDealStageSchema>
export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>
export type ReorderDealStageInput = z.infer<typeof reorderDealStageSchema>
