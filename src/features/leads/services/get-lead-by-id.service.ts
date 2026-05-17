import 'server-only'

import { findLeadByIdRepository } from '@/features/leads/repositories/lead.repository'

export async function getLeadByIdService(organizationId: string, leadId: string) {
  return findLeadByIdRepository(organizationId, leadId)
}
