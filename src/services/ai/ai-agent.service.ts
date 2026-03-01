import { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import type {
  AgentSkillBindingInput,
  CreateAiAgentInput,
  UpdateAiAgentInput,
} from '@/schemas/ai/ai-schemas'

const aiTriggerSelect = {
  id: true,
  agentId: true,
  eventType: true,
  conditions: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AiTriggerSelect

const aiSchemaFieldSelect = {
  id: true,
  agentId: true,
  fieldName: true,
  fieldType: true,
  description: true,
  isRequired: true,
  options: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AiSchemaFieldSelect

const aiSkillBindingSelect = {
  id: true,
  agentId: true,
  skillId: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  skill: {
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      source: true,
      isActive: true,
    },
  },
} satisfies Prisma.AiAgentSkillSelect

const aiAgentSelect = {
  id: true,
  organizationId: true,
  name: true,
  icon: true,
  leanPrompt: true,
  model: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  triggers: { select: aiTriggerSelect },
  schemaFields: { select: aiSchemaFieldSelect },
  skillBindings: { select: aiSkillBindingSelect },
} satisfies Prisma.AiAgentSelect

type ServiceError = { error: string; status: 400 | 404 }

function toTriggerCreateInput(
  triggers: NonNullable<CreateAiAgentInput['triggers']> | NonNullable<UpdateAiAgentInput['triggers']>
) {
  return triggers.map((trigger) => ({
    eventType: trigger.eventType,
    conditions: (trigger.conditions || {}) as Prisma.InputJsonValue,
  }))
}

function toSchemaFieldCreateInput(
  fields:
    | NonNullable<CreateAiAgentInput['schemaFields']>
    | NonNullable<UpdateAiAgentInput['schemaFields']>
) {
  return fields.map((field) => ({
    fieldName: field.fieldName,
    fieldType: field.fieldType,
    description: field.description,
    isRequired: field.isRequired ?? true,
    options:
      field.options === null
        ? Prisma.JsonNull
        : field.options === undefined
          ? undefined
          : (field.options as Prisma.InputJsonValue),
  }))
}

function toSkillBindingCreateInput(bindings: AgentSkillBindingInput[]) {
  return bindings.map((binding) => ({
    skillId: binding.skillId,
    sortOrder: binding.sortOrder,
    isActive: binding.isActive ?? true,
  }))
}

async function validateOrganizationSkillBindings(
  organizationId: string,
  bindings: AgentSkillBindingInput[]
): Promise<{ ok: true } | { ok: false; error: ServiceError }> {
  if (bindings.length === 0) return { ok: true }

  const uniqueSkillIds = [...new Set(bindings.map((binding) => binding.skillId))]

  const skills = await prisma.aiSkill.findMany({
    where: {
      organizationId,
      id: { in: uniqueSkillIds },
    },
    select: { id: true },
  })

  if (skills.length !== uniqueSkillIds.length) {
    return {
      ok: false,
      error: { error: 'Uma ou mais skills não pertencem à organização', status: 400 },
    }
  }

  return { ok: true }
}

export async function listAiAgents(organizationId: string) {
  return prisma.aiAgent.findMany({
    where: { organizationId },
    select: aiAgentSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function createAiAgent(organizationId: string, input: CreateAiAgentInput) {
  if (input.skillBindings !== undefined) {
    const validation = await validateOrganizationSkillBindings(organizationId, input.skillBindings)
    if (!validation.ok) return validation.error
  }

  const created = await prisma.aiAgent.create({
    data: {
      organizationId,
      name: input.name,
      icon: input.icon,
      leanPrompt: input.leanPrompt,
      model: input.model || 'llama-3.3-70b-versatile',
      isActive: input.isActive ?? true,
      triggers: {
        create: input.triggers ? toTriggerCreateInput(input.triggers) : [],
      },
      schemaFields: {
        create: input.schemaFields ? toSchemaFieldCreateInput(input.schemaFields) : [],
      },
      skillBindings: {
        create: input.skillBindings ? toSkillBindingCreateInput(input.skillBindings) : [],
      },
    },
    select: aiAgentSelect,
  })

  return { data: created } as const
}

export async function getAiAgentById(organizationId: string, agentId: string) {
  return prisma.aiAgent.findFirst({
    where: {
      id: agentId,
      organizationId,
    },
    select: aiAgentSelect,
  })
}

export async function updateAiAgent(
  organizationId: string,
  agentId: string,
  input: UpdateAiAgentInput
) {
  if (input.skillBindings !== undefined) {
    const validation = await validateOrganizationSkillBindings(organizationId, input.skillBindings)
    if (!validation.ok) return validation.error
  }

  const existing = await prisma.aiAgent.findFirst({
    where: {
      id: agentId,
      organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Agente não encontrado' as const, status: 404 as const }
  }

  const data: Prisma.AiAgentUpdateInput = {
    name: input.name,
    icon: input.icon,
    leanPrompt: input.leanPrompt,
    model: input.model,
    isActive: input.isActive,
  }

  if (input.triggers !== undefined) {
    data.triggers = {
      deleteMany: {},
      create: toTriggerCreateInput(input.triggers),
    }
  }

  if (input.schemaFields !== undefined) {
    data.schemaFields = {
      deleteMany: {},
      create: toSchemaFieldCreateInput(input.schemaFields),
    }
  }

  if (input.skillBindings !== undefined) {
    data.skillBindings = {
      deleteMany: {},
      create: toSkillBindingCreateInput(input.skillBindings),
    }
  }

  const updated = await prisma.aiAgent.update({
    where: { id: existing.id },
    data,
    select: aiAgentSelect,
  })

  return { data: updated }
}

export async function deleteAiAgent(organizationId: string, agentId: string) {
  const existing = await prisma.aiAgent.findFirst({
    where: {
      id: agentId,
      organizationId,
    },
    select: { id: true },
  })

  if (!existing) {
    return { error: 'Agente não encontrado' as const, status: 404 as const }
  }

  await prisma.aiAgent.delete({
    where: { id: existing.id },
  })

  return { success: true as const }
}
