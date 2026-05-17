import 'server-only'

import { ensureProjectBelongsToOrganization, resolveProjectScope } from '@/server/project/project-scope'

import { createLeadSchema } from '@/features/leads/schemas/lead.schemas'
import { createLeadRepository } from '@/features/leads/repositories/lead.repository'
import { rethrowLeadConflict } from '@/features/leads/services/shared'

export async function createLeadService(input: {
  organizationId: string
  payload: unknown
}) {
  const parsed = createLeadSchema.parse(input.payload)
  const projectId = await resolveProjectScope({
    organizationId: input.organizationId,
    projectId: parsed.projectId,
  })

  if (projectId) {
    const project = await ensureProjectBelongsToOrganization(input.organizationId, projectId)
    if (!project) {
      throw new Error('Projeto inválido para esta organização')
    }
  }

  try {
    return await createLeadRepository({
      organizationId: input.organizationId,
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
