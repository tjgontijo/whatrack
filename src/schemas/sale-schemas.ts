import { z } from 'zod'

export const saleStatusSchema = z.enum(['pending', 'completed', 'cancelled'])

export const saleItemInputSchema = z.object({
  itemId: z.string().optional(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
})

export const createSaleSchema = z.object({
  totalAmount: z.number().optional(),
  profit: z.number().optional(),
  discount: z.number().optional(),
  status: saleStatusSchema.optional(),
  notes: z.string().optional(),
  items: z.array(saleItemInputSchema).optional(),
})

export const updateSaleSchema = z.object({
  totalAmount: z.number().optional(),
  profit: z.number().optional(),
  discount: z.number().optional(),
  status: saleStatusSchema.optional(),
  notes: z.string().optional(),
})

export const salesQuerySchema = z.object({
  q: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dateRange: z.string().optional(),
  status: z.string().optional(),
})

export const saleListItemSchema = z.object({
  id: z.string(),
  totalAmount: z.number().nullable(),
  status: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const salesResponseSchema = z.object({
  items: z.array(saleListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>
export type SalesQueryInput = z.infer<typeof salesQuerySchema>
export type SalesResponse = z.infer<typeof salesResponseSchema>
