import { z } from 'zod'

export const dashboardSummaryQuerySchema = z.object({
  period: z.string().default('7d'),
  trafficSource: z.string().default('any'),
  trafficType: z.string().default('any'),
  item: z.string().default('any'),
})

export type DashboardSummaryQueryInput = z.infer<typeof dashboardSummaryQuerySchema>
