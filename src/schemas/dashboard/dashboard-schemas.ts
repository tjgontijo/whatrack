import { z } from 'zod'

export const dashboardSummaryQuerySchema = z.object({
  period: z.string().default('7d'),
  trafficSource: z.string().default('any'),
  trafficType: z.string().default('any'),
  itemCategory: z.string().default('any'),
  item: z.string().default('any'),
  projectId: z.string().trim().min(1).optional(),
})

export type DashboardSummaryQueryInput = z.infer<typeof dashboardSummaryQuerySchema>
