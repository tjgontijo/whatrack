import "server-only"
import { DEFAULT_DEAL_STAGES } from '@/lib/constants/deal-stages'

type DbClient = any

export async function ensureDealStages(db: DbClient, organizationId: string) {
  await Promise.all(
    DEFAULT_DEAL_STAGES.map((stage) =>
      db.dealStage.upsert({
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
    )
  )
}

export async function getDefaultDealStage(db: DbClient, organizationId: string) {
  await ensureDealStages(db, organizationId)

  const defaultStage =
    (await db.dealStage.findFirst({
      where: { organizationId, isDefault: true },
      orderBy: { order: 'asc' },
    })) ||
    (await db.dealStage.findFirst({
      where: { organizationId },
      orderBy: { order: 'asc' },
    }))

  if (!defaultStage) {
    throw new Error(`DealStage default not found for organization ${organizationId}`)
  }

  return defaultStage
}
