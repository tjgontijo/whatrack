import { z } from 'zod'

export const itemCategoryListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  projectId: z.string().trim().min(1).optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

export const createItemCategorySchema = z.object({
  name: z.string().min(1),
  projectId: z.string().trim().min(1).nullable().optional(),
})

export const updateItemCategorySchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  projectId: z.string().trim().min(1).nullable().optional(),
})

export type ItemCategoryListQueryInput = z.infer<typeof itemCategoryListQuerySchema>
export type CreateItemCategoryInput = z.infer<typeof createItemCategorySchema>
export type UpdateItemCategoryInput = z.infer<typeof updateItemCategorySchema>
