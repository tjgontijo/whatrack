import { z } from 'zod'

export const createLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  mail: z.string().email().optional().or(z.literal('')),
  waId: z.string().optional(),
})

export const updateLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  mail: z.string().email().optional().or(z.literal('')).nullable(),
  waId: z.string().optional().nullable(),
})

export const leadsQuerySchema = z.object({
  q: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dateRange: z.string().optional(),
})

export const leadListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  mail: z.string().nullable(),
  waId: z.string().nullable(),
  createdAt: z.date(),
})

export const leadsResponseSchema = z.object({
  items: z.array(leadListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type LeadsQueryInput = z.infer<typeof leadsQuerySchema>
export type LeadsResponse = z.infer<typeof leadsResponseSchema>
