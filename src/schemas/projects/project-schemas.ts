import { z } from 'zod'

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  query: z.string().trim().max(120).optional(),
})

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(60).regex(slugRegex, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens.',
  }),
})

export const projectUpdateSchema = projectCreateSchema
  .partial()
  .omit({ slug: true })
  .extend({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(60)
      .regex(slugRegex, {
        message: 'Slug deve conter apenas letras minúsculas, números e hífens.',
      })
      .optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  })

export const projectDeleteQuerySchema = z.object({
  force: z.coerce.boolean().default(false),
})

export const projectCurrentUpdateSchema = z.object({
  projectId: z.string().trim().min(1).nullable(),
})

export const projectAssociationCountsSchema = z.object({
  whatsappCount: z.number().int().min(0),
  metaAdsCount: z.number().int().min(0),
  metaConnectionCount: z.number().int().min(0),
  metaPixelCount: z.number().int().min(0),
  leadCount: z.number().int().min(0),
  ticketCount: z.number().int().min(0),
  saleCount: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  itemCategoryCount: z.number().int().min(0),
})

export const projectListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  counts: projectAssociationCountsSchema,
})

const projectWhatsAppSummarySchema = z.object({
  id: z.string(),
  phoneId: z.string().nullable(),
  displayPhone: z.string().nullable(),
  verifiedName: z.string().nullable(),
  status: z.string(),
})

const projectMetaAdAccountSummarySchema = z.object({
  id: z.string(),
  adAccountId: z.string(),
  adAccountName: z.string(),
  isActive: z.boolean(),
})

export const projectDetailSchema = projectListItemSchema.extend({
  conversionCount: z.number().int().min(0),
  whatsappConfigs: z.array(projectWhatsAppSummarySchema),
  metaAdAccounts: z.array(projectMetaAdAccountSummarySchema),
})

export const projectListResponseSchema = z.object({
  items: z.array(projectListItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
})

export const projectDeleteConflictSchema = z.object({
  error: z.string(),
  counts: projectAssociationCountsSchema,
})

export const projectSlugCheckSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(slugRegex, {
    message: 'Slug inválido.',
  }),
  excludeProjectId: z.string().uuid().optional(),
})

export const projectSlugCheckResponseSchema = z.object({
  available: z.boolean(),
  slug: z.string(),
})

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>
export type ProjectDeleteQuery = z.infer<typeof projectDeleteQuerySchema>
export type ProjectCurrentUpdateInput = z.infer<typeof projectCurrentUpdateSchema>
export type ProjectAssociationCounts = z.infer<typeof projectAssociationCountsSchema>
export type ProjectListItem = z.infer<typeof projectListItemSchema>
export type ProjectDetail = z.infer<typeof projectDetailSchema>
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>
export type ProjectDeleteConflict = z.infer<typeof projectDeleteConflictSchema>
