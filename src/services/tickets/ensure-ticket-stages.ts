import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export const DEFAULT_TICKET_STAGES = [
  { name: 'Novo', color: '#6366f1', order: 1, isDefault: true, isClosed: false },
  { name: 'Em Atendimento', color: '#f59e0b', order: 2, isDefault: false, isClosed: false },
  { name: 'Negociação', color: '#8b5cf6', order: 3, isDefault: false, isClosed: false },
  { name: 'Fechado/Ganho', color: '#22c55e', order: 4, isDefault: false, isClosed: true },
  { name: 'Fechado/Perdido', color: '#ef4444', order: 5, isDefault: false, isClosed: true },
] as const

export async function ensureTicketStages(db: DbClient, organizationId: string) {
  for (const stage of DEFAULT_TICKET_STAGES) {
    await db.ticketStage.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: stage.name,
        },
      },
      update: {
        color: stage.color,
        order: stage.order,
        isDefault: stage.isDefault,
        isClosed: stage.isClosed,
      },
      create: {
        organizationId,
        ...stage,
      },
    })
  }
}

export async function getDefaultTicketStage(db: DbClient, organizationId: string) {
  await ensureTicketStages(db, organizationId)

  const defaultStage =
    (await db.ticketStage.findFirst({
      where: { organizationId, isDefault: true },
      orderBy: { order: 'asc' },
    })) ||
    (await db.ticketStage.findFirst({
      where: { organizationId },
      orderBy: { order: 'asc' },
    }))

  if (!defaultStage) {
    throw new Error(`TicketStage default not found for organization ${organizationId}`)
  }

  return defaultStage
}
