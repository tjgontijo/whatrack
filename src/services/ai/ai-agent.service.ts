import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import type { CreateAiAgentInput, UpdateAiAgentInput } from '@/schemas/ai/ai-schemas'

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

const aiAgentSelect = {
  id: true,
  organizationId: true,
  name: true,
  icon: true,
  systemPrompt: true,
  model: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  triggers: { select: aiTriggerSelect },
  schemaFields: { select: aiSchemaFieldSelect },
} satisfies Prisma.AiAgentSelect

export async function listAiAgents(organizationId: string) {
  return prisma.aiAgent.findMany({
    where: { organizationId },
    select: aiAgentSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function createAiAgent(organizationId: string, input: CreateAiAgentInput) {
  return prisma.aiAgent.create({
    data: {
      organizationId,
      name: input.name,
      icon: input.icon,
      systemPrompt: input.systemPrompt,
      model: input.model || 'llama-3.3-70b-versatile',
      isActive: input.isActive ?? true,
      triggers: {
        create:
          input.triggers?.map((trigger) => ({
            eventType: trigger.eventType,
            conditions: (trigger.conditions || {}) as Prisma.InputJsonValue,
          })) || [],
      },
      schemaFields: {
        create:
          input.schemaFields?.map((field) => ({
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
          })) || [],
      },
    },
    select: aiAgentSelect,
  })
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

  const updated = await prisma.aiAgent.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      icon: input.icon,
      systemPrompt: input.systemPrompt,
      model: input.model,
      isActive: input.isActive,
      triggers: {
        deleteMany: {},
        create:
          input.triggers?.map((trigger) => ({
            eventType: trigger.eventType,
            conditions: (trigger.conditions || {}) as Prisma.InputJsonValue,
          })) || [],
      },
      schemaFields: {
        deleteMany: {},
        create:
          input.schemaFields?.map((field) => ({
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
          })) || [],
      },
    },
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
