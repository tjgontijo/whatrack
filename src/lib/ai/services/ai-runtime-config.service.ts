import 'server-only'

import { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { aiAgentRegistryService } from '@/lib/ai/services/ai-agent-registry.service'
import { aiProjectDefaultsService } from '@/lib/ai/services/ai-project-defaults.service'
import { fail, ok, type Result } from '@/lib/shared/result'
import { ensureProjectBelongsToOrganization } from '@/server/project/project-scope'
import type { UpdateAiRuntimeConfigInput } from '@/schemas/ai/ai-runtime-schemas'

async function ensureScopedProject(organizationId: string, projectId: string) {
  const project = await ensureProjectBelongsToOrganization(organizationId, projectId)
  if (!project) {
    return fail(`Project ${projectId} not found for organization ${organizationId}`)
  }

  return ok(project)
}

export async function getAiRuntimeConfig(input: {
  organizationId: string
  projectId: string
}) {
  const project = await ensureScopedProject(input.organizationId, input.projectId)
  if (!project.success) {
    return project
  }

  const ensured = await aiProjectDefaultsService.ensureAiProjectDefaults(
    input.projectId,
    input.organizationId
  )
  if (!ensured.success) {
    return fail(ensured.error)
  }

  const [projectConfig, inboundAgentConfig] = await Promise.all([
    prisma.aiProjectConfig.findUnique({
      where: {
        projectId: input.projectId,
      },
    }),
    aiAgentRegistryService.getProjectConfig('whatsapp-inbound', input.projectId),
  ])

  if (!projectConfig) {
    return fail(`AiProjectConfig not found for project ${input.projectId}`)
  }

  if (!inboundAgentConfig.success) {
    return fail(inboundAgentConfig.error)
  }

  return ok({
    projectConfig,
    inboundAgent: inboundAgentConfig.data,
  })
}

export async function updateAiRuntimeConfig(input: {
  organizationId: string
  projectId: string
  data: UpdateAiRuntimeConfigInput
}): Promise<
  Result<{
    projectConfig: Awaited<ReturnType<typeof prisma.aiProjectConfig.update>>
    inboundAgent: Awaited<ReturnType<typeof aiAgentRegistryService.getProjectConfig>>
  }>
> {
  const project = await ensureScopedProject(input.organizationId, input.projectId)
  if (!project.success) {
    return project
  }

  const ensured = await aiProjectDefaultsService.ensureAiProjectDefaults(
    input.projectId,
    input.organizationId
  )
  if (!ensured.success) {
    return fail(ensured.error)
  }

  const updatePayload: Prisma.AiProjectConfigUncheckedUpdateInput = {
    organizationId: input.organizationId,
    ...(typeof input.data.blueprintSlug !== 'undefined'
      ? { blueprintSlug: input.data.blueprintSlug }
      : {}),
    ...(typeof input.data.businessName !== 'undefined'
      ? { businessName: input.data.businessName }
      : {}),
    ...(typeof input.data.niche !== 'undefined' ? { niche: input.data.niche } : {}),
    ...(typeof input.data.productDescription !== 'undefined'
      ? { productDescription: input.data.productDescription }
      : {}),
    ...(typeof input.data.pricingInfo !== 'undefined'
      ? { pricingInfo: input.data.pricingInfo }
      : {}),
    ...(typeof input.data.nextStepType !== 'undefined'
      ? { nextStepType: input.data.nextStepType }
      : {}),
    ...(typeof input.data.assistantName !== 'undefined'
      ? { assistantName: input.data.assistantName }
      : {}),
    ...(typeof input.data.escalationContact !== 'undefined'
      ? { escalationContact: input.data.escalationContact }
      : {}),
    ...(typeof input.data.businessHours !== 'undefined'
      ? {
          businessHours:
            input.data.businessHours === null
              ? Prisma.JsonNull
              : (input.data.businessHours as unknown as Prisma.InputJsonValue),
        }
      : {}),
    ...(typeof input.data.debounceMs !== 'undefined'
      ? { debounceMs: input.data.debounceMs }
      : {}),
    ...(typeof input.data.testingModeEnabled !== 'undefined'
      ? { testingModeEnabled: input.data.testingModeEnabled }
      : {}),
    ...(typeof input.data.testingPhones !== 'undefined'
      ? {
          testingPhones:
            input.data.testingPhones as unknown as Prisma.InputJsonValue,
        }
      : {}),
  }

  const projectConfig = await prisma.aiProjectConfig.update({
    where: {
      projectId: input.projectId,
    },
    data: updatePayload,
  })

  if (input.data.inboundAgent) {
    const agentUpdate = await aiAgentRegistryService.upsertProjectConfig(
      'whatsapp-inbound',
      input.projectId,
      {
        enabled: input.data.inboundAgent.enabled,
        paused: input.data.inboundAgent.paused,
      }
    )

    if (!agentUpdate.success) {
      return fail(agentUpdate.error)
    }
  }

  const inboundAgent = await aiAgentRegistryService.getProjectConfig(
    'whatsapp-inbound',
    input.projectId
  )
  if (!inboundAgent.success) {
    return fail(inboundAgent.error)
  }

  return ok({
    projectConfig,
    inboundAgent,
  })
}

export const aiRuntimeConfigService = {
  getAiRuntimeConfig,
  updateAiRuntimeConfig,
}
