import 'server-only'

import { ensureProjectBelongsToOrganization, resolveProjectScope } from '@/server/project/project-scope'

import { updateSaleSchema } from '@/features/sales/schemas/sale.schemas'
import { findSaleForUpdateRepository, updateSaleRepository } from '@/features/sales/repositories'

export async function updateSaleService(input: {
  organizationId: string
  saleId: string
  userId?: string
  projectId?: string | null
  payload: unknown
}) {
  const parsed = updateSaleSchema.parse(input.payload)
  const projectId =
    typeof parsed.projectId !== 'undefined'
      ? await resolveProjectScope({ organizationId: input.organizationId, projectId: parsed.projectId })
      : input.projectId

  const existing = await findSaleForUpdateRepository({
    organizationId: input.organizationId,
    saleId: input.saleId,
    projectId,
  })

  if (!existing) {
    return null
  }

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  const statusChangedAt =
    parsed.status && parsed.status !== existing.status ? new Date() : existing.statusChangedAt

  return updateSaleRepository({
    saleId: input.saleId,
    userId: input.userId,
    projectId,
    totalAmount: parsed.totalAmount,
    profit: parsed.profit,
    discount: parsed.discount,
    status: parsed.status,
    notes: parsed.notes,
    statusChangedAt,
  })
}
