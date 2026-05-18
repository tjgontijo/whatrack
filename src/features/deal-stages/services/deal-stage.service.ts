import "server-only"
import { prisma } from '@/lib/db/prisma'

type ServiceError = {
  error: string
  status: 400 | 404 | 409
}

export type DealStageListItem = {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
  isClosed: boolean
  dealsCount: number
  metaRules: {
    id: string
    pixelId: string
    eventName: string
    fireOnce: boolean
  }[]
}

export async function listDealStages(
  organizationId: string,
  projectId?: string
): Promise<{ items: DealStageListItem[] }> {
  // 1. Tentar buscar fases específicas do projeto
  let stages = await prisma.dealStage.findMany({
    where: { organizationId, projectId: projectId ?? null },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isDefault: true,
      isClosed: true,
      _count: { select: { deals: true } },
      metaRules: {
        select: {
          id: true,
          pixelId: true,
          eventName: true,
          fireOnce: true,
        },
      },
    },
  })

  // 2. Fallback: Se o projeto foi solicitado mas não tem fases, busca as fases padrão da organização (projectId: null)
  if (stages.length === 0 && projectId) {
    stages = await prisma.dealStage.findMany({
      where: { organizationId, projectId: null },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        isDefault: true,
        isClosed: true,
        _count: { select: { deals: true } },
        metaRules: {
          select: {
            id: true,
            pixelId: true,
            eventName: true,
            fireOnce: true,
          },
        },
      },
    })
  }

  return {
    items: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      order: stage.order,
      isDefault: stage.isDefault,
      isClosed: stage.isClosed,
      dealsCount: stage._count.deals,
      metaRules: stage.metaRules,
    })),
  }
}

export async function createDealStage(input: {
  organizationId: string
  projectId?: string
  name: string
  color: string
  order?: number
  metaRules?: {
    pixelId: string
    eventName: string
    fireOnce: boolean
  }[]
}): Promise<DealStageListItem | ServiceError> {
  const existing = await prisma.dealStage.findFirst({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name,
    },
    select: { id: true },
  })
  if (existing) {
    return { error: 'Já existe uma fase com esse nome neste projeto', status: 409 }
  }

  let order = input.order
  if (order === undefined) {
    const maxOrder = await prisma.dealStage.aggregate({
      where: { organizationId: input.organizationId, projectId: input.projectId ?? null },
      _max: { order: true },
    })
    order = (maxOrder._max.order ?? -1) + 1
  }

  const stage = await prisma.dealStage.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name,
      color: input.color,
      order,
      metaRules: {
        create: input.metaRules?.map((rule) => ({
          pixelId: rule.pixelId,
          eventName: rule.eventName,
          fireOnce: rule.fireOnce,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isDefault: true,
      isClosed: true,
      _count: { select: { deals: true } },
      metaRules: {
        select: {
          id: true,
          pixelId: true,
          eventName: true,
          fireOnce: true,
        },
      },
    },
  })

  return {
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order: stage.order,
    isDefault: stage.isDefault,
    isClosed: stage.isClosed,
    dealsCount: stage._count.deals,
    metaRules: stage.metaRules,
  }
}

export async function updateDealStage(input: {
  organizationId: string
  projectId?: string
  stageId: string
  name?: string
  color?: string
  isDefault?: boolean
  isClosed?: boolean
  metaRules?: {
    id?: string
    pixelId: string
    eventName: string
    fireOnce: boolean
  }[]
}): Promise<DealStageListItem | ServiceError> {
  const existing = await prisma.dealStage.findFirst({
    where: {
      id: input.stageId,
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
    },
    select: { id: true, name: true, projectId: true },
  })
  if (!existing) {
    return { error: 'Fase não encontrada', status: 404 }
  }

  if (input.name && input.name !== existing.name) {
    const conflict = await prisma.dealStage.findFirst({
      where: {
        organizationId: input.organizationId,
        projectId: existing.projectId,
        name: input.name,
      },
      select: { id: true },
    })
    if (conflict) {
      return { error: 'Já existe uma fase com esse nome neste projeto', status: 409 }
    }
  }

  if (input.isDefault) {
    await prisma.dealStage.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: existing.projectId,
        id: { not: input.stageId },
      },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.dealStage.update({
    where: { id: input.stageId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      ...(input.isClosed !== undefined && { isClosed: input.isClosed }),
      metaRules: input.metaRules
        ? {
            deleteMany: {},
            create: input.metaRules.map((rule) => ({
              pixelId: rule.pixelId,
              eventName: rule.eventName,
              fireOnce: rule.fireOnce,
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isDefault: true,
      isClosed: true,
      _count: { select: { deals: true } },
      metaRules: {
        select: {
          id: true,
          pixelId: true,
          eventName: true,
          fireOnce: true,
        },
      },
    },
  })

  return {
    id: updated.id,
    name: updated.name,
    color: updated.color,
    order: updated.order,
    isDefault: updated.isDefault,
    isClosed: updated.isClosed,
    dealsCount: updated._count.deals,
    metaRules: updated.metaRules,
  }
}

export async function deleteDealStage(input: {
  organizationId: string
  projectId?: string
  stageId: string
}): Promise<{ success: true } | ServiceError> {
  const stage = await prisma.dealStage.findFirst({
    where: {
      id: input.stageId,
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
    },
    select: { id: true, isDefault: true, projectId: true },
  })
  if (!stage) {
    return { error: 'Fase não encontrada', status: 404 }
  }

  if (stage.isDefault) {
    return { error: 'Não é possível excluir a fase padrão', status: 409 }
  }

  const count = await prisma.dealStage.count({
    where: { organizationId: input.organizationId, projectId: stage.projectId },
  })
  if (count <= 1) {
    return { error: 'A organização deve ter ao menos uma fase', status: 409 }
  }

  const defaultStage = await prisma.dealStage.findFirst({
    where: {
      organizationId: input.organizationId,
      projectId: stage.projectId,
      isDefault: true,
    },
    select: { id: true },
  })

  if (defaultStage) {
    await prisma.deal.updateMany({
      where: { stageId: input.stageId, organizationId: input.organizationId },
      data: { stageId: defaultStage.id },
    })
  }

  await prisma.dealStage.delete({ where: { id: input.stageId } })

  return { success: true }
}

export async function reorderDealStages(input: {
  organizationId: string
  projectId?: string
  orderedIds: string[]
}): Promise<{ success: true } | ServiceError> {
  const stages = await prisma.dealStage.findMany({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      id: { in: input.orderedIds },
    },
    select: { id: true },
  })

  if (stages.length !== input.orderedIds.length) {
    return { error: 'Algumas fases não foram encontradas', status: 404 }
  }

  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.dealStage.update({
        where: { id },
        data: { order: index },
      })
    )
  )

  return { success: true }
}
