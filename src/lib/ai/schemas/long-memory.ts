import { z } from 'zod'

export const longMemorySchema = z.object({
  facts: z.array(z.string().min(1).max(200)).max(20).default([]),
  preferences: z.array(z.string().min(1).max(200)).max(10).default([]),
  history_summary: z.string().max(500).optional(),
})

export type LongMemory = z.infer<typeof longMemorySchema>
