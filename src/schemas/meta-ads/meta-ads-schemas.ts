import { z } from 'zod'

export const campaignsQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
  accountId: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export const insightsQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export const metaCopilotAnalyzeRequestSchema = z.object({
  organizationId: z.string().min(1).optional(),
  campaignId: z.string().min(1),
  accountId: z.string().min(1),
  campaignName: z.string().min(1),
  days: z.coerce.number().int().min(1).max(365).default(7),
})

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
export type MetaCopilotAnalyzeRequestInput = z.infer<typeof metaCopilotAnalyzeRequestSchema>
