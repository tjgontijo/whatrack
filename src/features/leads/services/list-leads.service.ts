import 'server-only'

import { resolveProjectScope } from '@/server/project/project-scope'

import { leadsQuerySchema, leadsResponseSchema } from '@/features/leads/schemas/lead.schemas'
import { listLeadsRepository } from '@/features/leads/repositories'
import { resolveOptionalDateRange } from '@/features/leads/services/shared'

export async function listLeadsService(input: {
  organizationId: string
  filters: unknown
}) {
  const parsed = leadsQuerySchema.parse(input.filters)
  const q = parsed.q.trim()
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: parsed.projectId,
  })

  const { items, total } = await listLeadsRepository({
    organizationId: input.organizationId,
    projectId,
    q,
    page: parsed.page,
    pageSize: parsed.pageSize,
    dateRange: parsed.dateRange,
    dateFilter: resolveOptionalDateRange(parsed.dateRange),
  })

  return leadsResponseSchema.parse({
    items: items.map((item) => ({
      ...item,
      projectId: item.projectId,
      projectName: item.project?.name ?? null,
    })),
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  })
}
