import { z } from 'zod'

export const auditLogPeriodPresets = [
  'today',
  'yesterday',
  '3d',
  '7d',
  '15d',
  '30d',
  'thisMonth',
  'lastMonth',
  'custom',
] as const

export const systemAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  periodPreset: z.enum(auditLogPeriodPresets).default('7d'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  resourceType: z.string().optional(),
  organizationId: z.string().optional(),
})

export type SystemAuditLogsQueryInput = z.infer<typeof systemAuditLogsQuerySchema>
export type AuditLogPeriodPreset = (typeof auditLogPeriodPresets)[number]
