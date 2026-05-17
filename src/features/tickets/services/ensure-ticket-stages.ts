import { DEFAULT_TICKET_STAGES } from '@/lib/constants/ticket-stages'

type DbClient = any

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
