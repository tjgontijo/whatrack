import { z } from 'zod'

import { TICKET_STATUSES } from '@/lib/constants/ticket-statuses'

export const ticketsQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  stageId: z.string().uuid('ID de estágio inválido').optional(),
  assigneeId: z.string().uuid('ID de atribuído inválido').optional(),
  projectId: z.string().uuid('ID de projeto inválido').optional(),
  sourceType: z.string().optional(),
  utmSource: z.string().optional(),
  windowStatus: z.enum(['open', 'expired']).optional(),
  dateRange: z.enum(['today', '7d', '30d', 'thisMonth']).optional(),
  page: z.coerce.number().int().positive('Página deve ser positiva').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive('Tamanho da página deve ser positivo')
    .max(100, 'Tamanho máximo de página é 100')
    .default(20),
})

export const createTicketSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  projectId: z.string().uuid('ID de projeto inválido').optional().nullable(),
  stageId: z.string().uuid('ID de estágio inválido').optional(),
  assigneeId: z.string().uuid('ID de atribuído inválido').optional().nullable(),
  dealValue: z.number().nonnegative('Deal value não pode ser negativo').optional().nullable(),
  notes: z.string().max(1000, 'Notas muito longas').optional(),
})

export const updateTicketSchema = z.object({
  stageId: z.string().uuid('ID de estágio inválido').optional(),
  assigneeId: z.string().uuid('ID de atribuído inválido').optional().nullable(),
  dealValue: z.number().nonnegative('Deal value não pode ser negativo').optional().nullable(),
  projectId: z.string().uuid('ID de projeto inválido').optional().nullable(),
})

export const closeTicketSchema = z.object({
  reason: z.enum(['won', 'lost'] as const),
  closedReason: z.string().max(500, 'Motivo de fechamento muito longo').optional(),
  dealValue: z.number().nonnegative('Deal value não pode ser negativo').optional().nullable(),
})

export type TicketsQueryInput = z.infer<typeof ticketsQuerySchema>
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CloseTicketInput = z.infer<typeof closeTicketSchema>
