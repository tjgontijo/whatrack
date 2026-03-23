import { z } from 'zod'

export const aiCrisisKeywordSchema = z.object({
  keyword: z.string().min(2).max(100),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  escalationResponse: z.string().min(10).max(500),
  isActive: z.boolean().default(true),
})

export type AiCrisisKeywordInput = z.infer<typeof aiCrisisKeywordSchema>
