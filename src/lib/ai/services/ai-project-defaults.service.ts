import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { aiAgentRegistryService } from '@/lib/ai/services/ai-agent-registry.service'
import { fail, ok, type Result } from '@/lib/shared/result'

const DEFAULT_BLUEPRINT_SLUG = 'whatsapp-commercial-agent'

export async function ensureAiProjectDefaults(
  projectId: string,
  organizationId: string
): Promise<Result<{ projectConfigId: string }>> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  })

  if (!project) {
    return fail(`Project ${projectId} not found for organization ${organizationId}`)
  }

  const projectConfig = await prisma.aiProjectConfig.upsert({
    where: {
      projectId,
    },
    update: {
      organizationId,
    },
    create: {
      organizationId,
      projectId,
      blueprintSlug: DEFAULT_BLUEPRINT_SLUG,
      debounceMs: 8000,
      testingModeEnabled: false,
    },
  })

  const provisioned = await aiAgentRegistryService.provisionDefaults(
    projectId,
    organizationId
  )

  if (!provisioned.success) {
    return fail(provisioned.error)
  }

  return ok({
    projectConfigId: projectConfig.id,
  })
}

export const aiProjectDefaultsService = {
  ensureAiProjectDefaults,
}
