import { z } from 'zod'

export const leadAuditRecordSchema = z.object({
  id: z.string(),
  lead_id: z.string(),
  qualy_audit: z.string().nullable(),
  time_audit: z.string().nullable(),
  createdAt: z.string(),
  updated_at: z.string(),
})

export const leadAuditResponseSchema = z.object({
  lead: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    createdAt: z.string(),
  }),
  audits: z.array(leadAuditRecordSchema),
})

export type LeadAuditRecord = z.infer<typeof leadAuditRecordSchema>
export type LeadAuditResponse = z.infer<typeof leadAuditResponseSchema>
