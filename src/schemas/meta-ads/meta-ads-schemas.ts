import { z } from 'zod'

export const campaignsQuerySchema = z.object({
  accountId: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
}).strict()

export const insightsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
}).strict()

export const metaAdAccountsQuerySchema = z.object({
  sync: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
}).strict()

export const metaConnectionDeleteQuerySchema = z.object({
  id: z.string().min(1),
}).strict()

export const metaRouteParamsSchema = z.object({
  id: z.string().min(1),
}).strict()

export const metaAdAccountToggleBodySchema = z.object({
  isActive: z.boolean(),
}).strict()

export const metaPixelCreateBodySchema = z.object({
  name: z.string().trim().min(1),
  pixelId: z.string().trim().min(1),
  capiToken: z.string().trim().min(1),
}).strict()

export const metaPixelUpdateBodySchema = z
  .object({
    isActive: z.boolean().optional(),
    name: z.string().trim().min(1).optional(),
    pixelId: z.string().trim().min(1).optional(),
    capiToken: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(
    (value) =>
      typeof value.isActive === 'boolean' ||
      typeof value.name !== 'undefined' ||
      typeof value.pixelId !== 'undefined' ||
      typeof value.capiToken !== 'undefined',
    {
      message: 'At least one field must be provided',
    }
  )

export const metaCopilotAnalyzeRequestSchema = z.object({
  campaignId: z.string().min(1),
  accountId: z.string().min(1),
  campaignName: z.string().min(1),
  days: z.coerce.number().int().min(1).max(365).default(7),
}).strict()

export const analysisMapZodSchema = z.object({
  status: z
    .enum(['CRITICAL', 'WARNING', 'HEALTHY'])
    .describe('Diagnostico geral de saude sistemica da campanha.'),
  executiveSummary: z
    .string()
    .describe(
      'Resumo analitico direto ao ponto sobre o comportamento da campanha. Mencione dias da semana, sazonalidade e ofensores/highlights quando relevantes.'
    ),
  deepDiagnostics: z
    .array(
      z.object({
        area: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
        observation: z.string(),
        rootCause: z.string(),
      })
    )
    .describe('Diagnostico profundo. Liste os de alta severidade primeiro.'),
  keyRecommendations: z
    .array(
      z.object({
        priority: z.number().int(),
        action: z.string(),
      })
    )
    .max(4)
    .describe('Apenas 1 a 4 recomendacoes vitais e baseadas nos diagnosticos.'),
})

export type CampaignsQueryInput = z.infer<typeof campaignsQuerySchema>
export type InsightsQueryInput = z.infer<typeof insightsQuerySchema>
export type MetaAdAccountsQueryInput = z.infer<typeof metaAdAccountsQuerySchema>
export type MetaConnectionDeleteQueryInput = z.infer<typeof metaConnectionDeleteQuerySchema>
export type MetaRouteParamsInput = z.infer<typeof metaRouteParamsSchema>
export type MetaAdAccountToggleBodyInput = z.infer<typeof metaAdAccountToggleBodySchema>
export type MetaPixelCreateBodyInput = z.infer<typeof metaPixelCreateBodySchema>
export type MetaPixelUpdateBodyInput = z.infer<typeof metaPixelUpdateBodySchema>
export type MetaCopilotAnalyzeRequestInput = z.infer<typeof metaCopilotAnalyzeRequestSchema>
