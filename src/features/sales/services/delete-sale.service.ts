import 'server-only'

import { resolveProjectScope } from '@/server/project/project-scope'

import { deleteSaleRepository, findSaleForDeleteRepository } from '@/features/sales/repositories'

export async function deleteSaleService(input: {
  organizationId: string
  saleId: string
  projectId?: string | null
}) {
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: input.projectId,
  })

  const existing = await findSaleForDeleteRepository({
    organizationId: input.organizationId,
    projectId,
    saleId: input.saleId,
  })

  if (!existing) {
    return false
  }

  await deleteSaleRepository(input.saleId)
  return true
}
