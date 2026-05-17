import 'server-only'

import {
  createLeadService,
  deleteLeadService,
  getLeadByIdService,
  listLeadsService,
  updateLeadService,
} from '@/features/leads/server'
import {
  createLeadSchema,
  leadsQuerySchema,
  type CreateLeadInput,
  type LeadsQueryInput,
  type LeadsResponse,
  LeadConflictError,
  type UpdateLeadInput,
} from '@/features/leads'

export { LeadConflictError }

export type CreateLeadParams = {
  organizationId: string
  projectId?: string | null
  input: CreateLeadInput
}

export type ListLeadsParams = {
  organizationId: string
  projectId?: string | null
} & Omit<LeadsQueryInput, 'projectId'>

export type UpdateLeadParams = {
  organizationId: string
  leadId: string
  projectId?: string | null
  input: UpdateLeadInput
}

export type DeleteLeadParams = {
  organizationId: string
  leadId: string
}

export async function createLead(params: CreateLeadParams) {
  return createLeadService({
    organizationId: params.organizationId,
    payload: {
      ...params.input,
      projectId: typeof params.input.projectId !== 'undefined' ? params.input.projectId : params.projectId,
    },
  })
}

export async function listLeads(params: ListLeadsParams): Promise<LeadsResponse> {
  return listLeadsService({
    organizationId: params.organizationId,
    filters: {
      ...params,
      projectId: params.projectId,
    },
  })
}

export async function getLeadById(organizationId: string, leadId: string) {
  return getLeadByIdService(organizationId, leadId)
}

export async function updateLead(params: UpdateLeadParams) {
  return updateLeadService({
    organizationId: params.organizationId,
    leadId: params.leadId,
    payload: {
      ...params.input,
      projectId: typeof params.input.projectId !== 'undefined' ? params.input.projectId : params.projectId,
    },
  })
}

export async function deleteLead(params: DeleteLeadParams) {
  return deleteLeadService(params)
}

export {
  createLeadSchema,
  leadsQuerySchema,
}
