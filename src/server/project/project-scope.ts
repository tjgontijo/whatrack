import { prisma } from '@/lib/db/prisma'
import { getCurrentProjectId } from './get-current-project-id'

function normalizeProjectId(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function ensureProjectBelongsToOrganization(
  organizationId: string,
  projectId: string | null | undefined,
) {
  const normalized = normalizeProjectId(projectId)
  if (!normalized) {
    return null
  }

  return prisma.project.findFirst({
    where: {
      id: normalized,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  })
}

export async function resolveProjectScope(input: {
  organizationId: string
  projectId?: string | null
}) {
  if (typeof input.projectId !== 'undefined') {
    const explicitProject = await ensureProjectBelongsToOrganization(
      input.organizationId,
      input.projectId,
    )

    return explicitProject?.id ?? null
  }

  return getCurrentProjectId(input.organizationId)
}
