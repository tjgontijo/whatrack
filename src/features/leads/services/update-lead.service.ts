import 'server-only'

import { findLeadByIdRepository, updateLeadRepository } from '@/features/leads/repositories'

import { updateLeadSchema } from '@/features/leads/schemas/lead.schemas'
import { rethrowLeadConflict } from '@/features/leads/services/shared'
import {
  ensureProjectBelongsToOrganization,
  resolveProjectScope,
} from '@/server/project/project-scope'

export async function updateLeadService(input: {
  organizationId: string
  leadId: string
  payload: unknown
}) {
  const existing = await findLeadByIdRepository(input.organizationId, input.leadId)
  if (!existing) {
    return null
  }

  const parsed = updateLeadSchema.parse(input.payload)
  const projectId =
    typeof parsed.projectId !== 'undefined'
      ? await resolveProjectScope({
          organizationId: input.organizationId,
          projectId: parsed.projectId,
        })
      : undefined

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  try {
    return await updateLeadRepository({
      leadId: input.leadId,
      projectId,
      name: parsed.name,
      phone: parsed.phone,
      mail: parsed.mail,
      waId: parsed.waId,
    })
  } catch (error) {
    rethrowLeadConflict(error)
  }
}
