import { z } from 'zod'

export const itemListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

export const createItemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
})

export const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export type ItemListQueryInput = z.infer<typeof itemListQuerySchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
