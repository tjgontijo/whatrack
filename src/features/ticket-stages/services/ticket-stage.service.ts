import { prisma } from '@/lib/db/prisma'

type ServiceError = {
  error: string
  status: 400 | 404 | 409
}

export type TicketStageListItem = {
  id: string
  name: string
  color: string
  order: number
  isDefault: boolean
  isClosed: boolean
  ticketsCount: number
}

export async function listTicketStages(
  organizationId: string,
  projectId?: string
): Promise<{ items: TicketStageListItem[] }> {
  const stages = await prisma.ticketStage.findMany({
    where: { organizationId, projectId: projectId ?? null },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isDefault: true,
      isClosed: true,
      _count: { select: { tickets: true } },
    },
  })

  return {
    items: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      order: stage.order,
      isDefault: stage.isDefault,
      isClosed: stage.isClosed,
      ticketsCount: stage._count.tickets,
    })),
  }
}

export async function createTicketStage(input: {
  organizationId: string
  projectId?: string
  name: string
  color: string
  order?: number
}): Promise<TicketStageListItem | ServiceError> {
  const existing = await prisma.ticketStage.findFirst({
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
    const maxOrder = await prisma.ticketStage.aggregate({
      where: { organizationId: input.organizationId, projectId: input.projectId ?? null },
      _max: { order: true },
    })
    order = (maxOrder._max.order ?? -1) + 1
  }

  const stage = await prisma.ticketStage.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      name: input.name,
      color: input.color,
      order,
    },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isDefault: true,
      isClosed: true,
      _count: { select: { tickets: true } },
    },
  })

  return {
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order: stage.order,
    isDefault: stage.isDefault,
    isClosed: stage.isClosed,
    ticketsCount: stage._count.tickets,
  }
}

export async function updateTicketStage(input: {
  organizationId: string
  projectId?: string
  stageId: string
  name?: string
  color?: string
  isDefault?: boolean
  isClosed?: boolean
}): Promise<TicketStageListItem | ServiceError> {
  const existing = await prisma.ticketStage.findFirst({
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
    const conflict = await prisma.ticketStage.findFirst({
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
    await prisma.ticketStage.updateMany({
      where: {
        organizationId: input.organizationId,
        projectId: existing.projectId,
        id: { not: input.stageId },
      },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.ticketStage.update({
    where: { id: input.stageId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      ...(input.isClosed !== undefined && { isClosed: input.isClosed }),
    },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      isDefault: true,
      isClosed: true,
      _count: { select: { tickets: true } },
    },
  })

  return {
    id: updated.id,
    name: updated.name,
    color: updated.color,
    order: updated.order,
    isDefault: updated.isDefault,
    isClosed: updated.isClosed,
    ticketsCount: updated._count.tickets,
  }
}

export async function deleteTicketStage(input: {
  organizationId: string
  projectId?: string
  stageId: string
}): Promise<{ success: true } | ServiceError> {
  const stage = await prisma.ticketStage.findFirst({
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

  const count = await prisma.ticketStage.count({
    where: { organizationId: input.organizationId, projectId: stage.projectId },
  })
  if (count <= 1) {
    return { error: 'A organização deve ter ao menos uma fase', status: 409 }
  }

  const defaultStage = await prisma.ticketStage.findFirst({
    where: {
      organizationId: input.organizationId,
      projectId: stage.projectId,
      isDefault: true,
    },
    select: { id: true },
  })

  if (defaultStage) {
    await prisma.ticket.updateMany({
      where: { stageId: input.stageId, organizationId: input.organizationId },
      data: { stageId: defaultStage.id },
    })
  }

  await prisma.ticketStage.delete({ where: { id: input.stageId } })

  return { success: true }
}

export async function reorderTicketStages(input: {
  organizationId: string
  projectId?: string
  orderedIds: string[]
}): Promise<{ success: true } | ServiceError> {
  const stages = await prisma.ticketStage.findMany({
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
      prisma.ticketStage.update({
        where: { id },
        data: { order: index },
      })
    )
  )

  return { success: true }
}
