import 'server-only'

import { deleteLeadRepository, findLeadByIdRepository } from '@/features/leads/repositories'

export async function deleteLeadService(input: {
  organizationId: string
  leadId: string
}) {
  const existing = await findLeadByIdRepository(input.organizationId, input.leadId)
  if (!existing) {
    return false
  }

  await deleteLeadRepository(input.leadId)
  return true
}
