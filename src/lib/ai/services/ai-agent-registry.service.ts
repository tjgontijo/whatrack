import 'server-only'

import { Prisma } from '@/lib/db/client'
import { prisma } from '@/lib/db/prisma'
import { fail, ok } from '@/lib/shared/result'

async function resolveProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      organizationId: true,
    },
  })
}

async function resolveAgent(agentSlug: string) {
  return prisma.aiAgent.findUnique({
    where: { slug: agentSlug },
  })
}

export async function listAgents() {
  const agents = await prisma.aiAgent.findMany({
    orderBy: { name: 'asc' },
  })

  return ok(agents)
}

export async function getProjectConfig(agentSlug: string, projectId: string) {
  const agent = await resolveAgent(agentSlug)

  if (!agent) {
    return fail(`AI agent ${agentSlug} not found`)
  }

  const config = await prisma.aiAgentProjectConfig.findUnique({
    where: {
      agentId_projectId: {
        agentId: agent.id,
        projectId,
      },
    },
  })

  return ok({
    agent,
    config,
  })
}

export async function upsertProjectConfig(
  agentSlug: string,
  projectId: string,
  config: {
    enabled?: boolean
    paused?: boolean
    config?: unknown
  }
) {
  const [project, agent] = await Promise.all([
    resolveProject(projectId),
    resolveAgent(agentSlug),
  ])

  if (!project) {
    return fail(`Project ${projectId} not found`)
  }

  if (!agent) {
    return fail(`AI agent ${agentSlug} not found`)
  }

  const configPayload =
    config.config === undefined
      ? undefined
      : (config.config as Prisma.InputJsonValue)

  const record = await prisma.aiAgentProjectConfig.upsert({
    where: {
      agentId_projectId: {
        agentId: agent.id,
        projectId,
      },
    },
    update: {
      organizationId: project.organizationId,
      enabled: config.enabled,
      paused: config.paused,
      config: configPayload,
    },
    create: {
      organizationId: project.organizationId,
      projectId,
      agentId: agent.id,
      enabled: config.enabled ?? true,
      paused: config.paused ?? false,
      ...(configPayload === undefined ? {} : { config: configPayload }),
    },
  })

  return ok(record)
}

export async function isAgentEnabled(agentSlug: string, projectId: string) {
  const resolved = await getProjectConfig(agentSlug, projectId)

  if (!resolved.success) {
    return resolved
  }

  const { config } = resolved.data
  const enabled = config ? config.enabled && !config.paused : false

  return ok(enabled)
}

export async function provisionDefaults(
  projectId: string,
  organizationId: string
) {
  const agents = await prisma.aiAgent.findMany({
    where: { isSystem: true },
  })

  await Promise.all(
    agents.map((agent) =>
      prisma.aiAgentProjectConfig.upsert({
        where: {
          agentId_projectId: {
            agentId: agent.id,
            projectId,
          },
        },
        update: {},
        create: {
          organizationId,
          projectId,
          agentId: agent.id,
          enabled: true,
          paused: false,
        },
      })
    )
  )

  return ok(agents.length)
}

export const aiAgentRegistryService = {
  listAgents,
  getProjectConfig,
  upsertProjectConfig,
  isAgentEnabled,
  provisionDefaults,
}
