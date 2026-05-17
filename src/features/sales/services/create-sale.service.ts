import 'server-only'

import { ensureProjectBelongsToOrganization, resolveProjectScope } from '@/server/project/project-scope'

import { createSaleSchema } from '@/features/sales/schemas/sale.schemas'
import { createSaleRepository } from '@/features/sales/repositories'
import { calculateSaleTotal } from '@/features/sales/services/shared'

export async function createSaleService(input: {
  organizationId: string
  userId?: string
  projectId?: string | null
  payload: unknown
}) {
  const parsed = createSaleSchema.parse(input.payload)
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: typeof parsed.projectId !== 'undefined' ? parsed.projectId : input.projectId,
  })

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  return createSaleRepository({
    organizationId: input.organizationId,
    projectId,
    userId: input.userId,
    totalAmount: calculateSaleTotal(parsed),
    profit: parsed.profit,
    discount: parsed.discount,
    status: parsed.status,
    notes: parsed.notes,
    items: parsed.items,
  })
}
