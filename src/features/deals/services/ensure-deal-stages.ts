import "server-only"

type DbClient = any

export async function ensureDealStages(db: DbClient, organizationId: string, projectId?: string | null) {
  // Buscar o template padrão
  const defaultTemplate = await db.dealStageTemplate.findFirst({
    where: { isDefault: true },
    include: { items: { orderBy: { order: 'asc' } } },
  })

  if (!defaultTemplate) {
    throw new Error('No default deal stage template found in database.')
  }

  for (const item of defaultTemplate.items) {
    const existing = await db.dealStage.findFirst({
      where: {
        organizationId,
        projectId: projectId ?? null,
        name: item.name,
      },
    })

    const stageData = {
      color: item.color,
      order: item.order,
      isDefault: item.order === 0,
      isClosed: item.statusGroup !== 'ACTIVE',
      statusGroup: item.statusGroup,
      probability: item.probability,
      suggestedMetaEventName: item.suggestedMetaEventName,
    }

    if (existing) {
      await db.dealStage.update({
        where: { id: existing.id },
        data: stageData,
      })
    } else {
      await db.dealStage.create({
        data: {
          organizationId,
          projectId: projectId ?? null,
          name: item.name,
          ...stageData,
        },
      })
    }
  }
}

export async function getDefaultDealStage(db: DbClient, organizationId: string, projectId?: string | null) {
  // Tenta encontrar o estágio default existente
  let defaultStage = await db.dealStage.findFirst({
    where: { organizationId, projectId: projectId ?? null, isDefault: true },
    orderBy: { order: 'asc' },
  })

  // Se não encontrar, garante que os estágios existam (usando o template default)
  if (!defaultStage) {
    await ensureDealStages(db, organizationId, projectId)
    
    defaultStage = await db.dealStage.findFirst({
      where: { organizationId, projectId: projectId ?? null, isDefault: true },
      orderBy: { order: 'asc' },
    }) || await db.dealStage.findFirst({
      where: { organizationId, projectId: projectId ?? null },
      orderBy: { order: 'asc' },
    })
  }

  if (!defaultStage) {
    throw new Error(`DealStage default not found for organization ${organizationId} project ${projectId ?? 'none'}`)
  }

  return defaultStage
}
