import 'server-only'

import { resolveProjectScope } from '@/server/project/project-scope'

import { salesQuerySchema, salesResponseSchema } from '@/features/sales/schemas/sale.schemas'
import { listSalesRepository } from '@/features/sales/repositories'
import { resolveSalesDateFilter } from '@/features/sales/services/shared'

export async function listSalesService(input: {
  organizationId: string
  projectId?: string | null
  filters: unknown
}) {
  const parsed = salesQuerySchema.parse(input.filters)
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: typeof parsed.projectId !== 'undefined' ? parsed.projectId : input.projectId,
  })

  const status = parsed.status?.trim() || undefined
  const q = parsed.q.trim()

  const { sales, total } = await listSalesRepository({
    organizationId: input.organizationId,
    projectId,
    q,
    status,
    dateFilter: resolveSalesDateFilter(parsed.dateRange),
    page: parsed.page,
    pageSize: parsed.pageSize,
  })

  return salesResponseSchema.parse({
    items: sales.map((sale) => ({
      id: sale.id,
      totalAmount: sale.totalAmount ? Number(sale.totalAmount) : null,
      status: sale.status,
      notes: sale.notes,
      projectId: sale.projectId ?? null,
      projectName: sale.project?.name ?? null,
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
    })),
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  })
}
