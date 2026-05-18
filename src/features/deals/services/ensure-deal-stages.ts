import "server-only"
import { DEFAULT_DEAL_STAGES } from '@/lib/constants/deal-stages'

type DbClient = any

export async function ensureDealStages(db: DbClient, organizationId: string, projectId?: string | null) {
  for (const stage of DEFAULT_DEAL_STAGES) {
    const existing = await db.dealStage.findFirst({
      where: {
        organizationId,
        projectId: projectId ?? null,
        name: stage.name,
      },
    })

    if (existing) {
      await db.dealStage.update({
        where: { id: existing.id },
        data: {
          color: stage.color,
          order: stage.order,
          isDefault: stage.isDefault,
          isClosed: stage.isClosed,
        },
      })
    } else {
      await db.dealStage.create({
        data: {
          organizationId,
          projectId: projectId ?? null,
          ...stage,
        },
      })
    }
  }
}

export async function getDefaultDealStage(db: DbClient, organizationId: string, projectId?: string | null) {
  await ensureDealStages(db, organizationId, projectId)

  const defaultStage =
    (await db.dealStage.findFirst({
      where: { organizationId, projectId: projectId ?? null, isDefault: true },
      orderBy: { order: 'asc' },
    })) ||
    (await db.dealStage.findFirst({
      where: { organizationId, projectId: projectId ?? null },
      orderBy: { order: 'asc' },
    }))

  if (!defaultStage) {
    throw new Error(`DealStage default not found for organization ${organizationId} project ${projectId ?? 'none'}`)
  }

  return defaultStage
}
