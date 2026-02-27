import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import type { CreateAiSkillInput, UpdateAiSkillInput } from '@/schemas/ai/ai-schemas'

const aiSkillSelect = {
  id: true,
  organizationId: true,
  slug: true,
  name: true,
  description: true,
  content: true,
  kind: true,
  source: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AiSkillSelect

type ServiceError = {
  error: string
  status: 403 | 404 | 409
}

export async function listAiSkills(organizationId: string) {
  return prisma.aiSkill.findMany({
    where: { organizationId },
    select: aiSkillSelect,
    orderBy: [{ source: 'asc' }, { kind: 'asc' }, { name: 'asc' }],
  })
}

export async function getAiSkillById(organizationId: string, skillId: string) {
  return prisma.aiSkill.findFirst({
    where: {
      id: skillId,
      organizationId,
    },
    select: aiSkillSelect,
  })
}

export async function createAiSkill(organizationId: string, input: CreateAiSkillInput) {
  try {
    const created = await prisma.aiSkill.create({
      data: {
        organizationId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        content: input.content,
        kind: input.kind,
        source: 'CUSTOM',
        isActive: input.isActive ?? true,
      },
      select: aiSkillSelect,
    })

    return { data: created } as const
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        error: 'Já existe uma skill com esse slug nesta organização',
        status: 409,
      } as const
    }

    throw error
  }
}

export async function updateAiSkill(
  organizationId: string,
  skillId: string,
  input: UpdateAiSkillInput
) {
  const existing = await prisma.aiSkill.findFirst({
    where: {
      id: skillId,
      organizationId,
    },
    select: {
      id: true,
      source: true,
    },
  })

  if (!existing) {
    return { error: 'Skill não encontrada', status: 404 } as const
  }

  if (existing.source === 'SYSTEM') {
    return { error: 'Skills do sistema não podem ser editadas', status: 403 } as const
  }

  try {
    const updated = await prisma.aiSkill.update({
      where: { id: existing.id },
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        content: input.content,
        kind: input.kind,
        isActive: input.isActive,
      },
      select: aiSkillSelect,
    })

    return { data: updated } as const
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        error: 'Já existe uma skill com esse slug nesta organização',
        status: 409,
      } as const
    }

    throw error
  }
}

export async function deleteAiSkill(
  organizationId: string,
  skillId: string
): Promise<{ success: true } | ServiceError> {
  const existing = await prisma.aiSkill.findFirst({
    where: {
      id: skillId,
      organizationId,
    },
    select: {
      id: true,
      source: true,
    },
  })

  if (!existing) {
    return { error: 'Skill não encontrada', status: 404 }
  }

  if (existing.source === 'SYSTEM') {
    return { error: 'Skills do sistema não podem ser removidas', status: 403 }
  }

  await prisma.aiSkill.delete({
    where: { id: existing.id },
  })

  return { success: true }
}
