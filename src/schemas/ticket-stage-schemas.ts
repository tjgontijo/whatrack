import { z } from 'zod'

export const createTicketStageSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use formato hex #RRGGBB)'),
  order: z.number().int().nonnegative().optional(),
})

export const updateTicketStageSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')
    .optional(),
  isDefault: z.boolean().optional(),
  isClosed: z.boolean().optional(),
})

export const reorderTicketStageSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

export type CreateTicketStageInput = z.infer<typeof createTicketStageSchema>
export type UpdateTicketStageInput = z.infer<typeof updateTicketStageSchema>
export type ReorderTicketStageInput = z.infer<typeof reorderTicketStageSchema>
