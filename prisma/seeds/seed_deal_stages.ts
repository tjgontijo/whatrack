import type { PrismaClient } from '@generated/prisma'

export async function seedDealStages(prisma: PrismaClient) {
  console.log('Seeding deal stages from default template...')

  // 1. Buscar o template padrão
  const defaultTemplate = await prisma.dealStageTemplate.findFirst({
    where: { isDefault: true },
    include: { items: { orderBy: { order: 'asc' } } },
  })

  if (!defaultTemplate) {
    console.warn(
      '⚠️ No default deal stage template found. Make sure to run seedDealTemplates first.'
    )
    return
  }

  const organizations = await prisma.organization.findMany({
    include: { projects: { where: { isArchived: false } } },
    orderBy: { createdAt: 'asc' },
  })

  if (organizations.length === 0) {
    console.warn('⚠️ No organizations found. Deal stages not seeded.')
    return
  }

  for (const organization of organizations) {
    // 2. Garantir fases na Organização (projectId: null)
    for (const item of defaultTemplate.items) {
      const existing = await prisma.dealStage.findFirst({
        where: {
          organizationId: organization.id,
          projectId: null,
          name: item.name,
        },
      })

      const stageData = {
        color: item.color,
        order: item.order,
        isDefault: item.order === 0, // Assume o primeiro como default se não especificado
        isClosed: item.statusGroup !== 'ACTIVE',
        statusGroup: item.statusGroup,
        probability: item.probability,
        suggestedMetaEventName: item.suggestedMetaEventName,
      }

      if (existing) {
        await prisma.dealStage.update({
          where: { id: existing.id },
          data: stageData,
        })
      } else {
        await prisma.dealStage.create({
          data: {
            organizationId: organization.id,
            projectId: null,
            name: item.name,
            ...stageData,
          },
        })
      }
    }
    console.log(
      `Deal stages ensured for organization defaults: ${organization.name} (using template: ${defaultTemplate.name})`
    )

    // 3. Garantir fases em cada Projeto da Organização
    for (const project of organization.projects) {
      for (const item of defaultTemplate.items) {
        const existing = await prisma.dealStage.findFirst({
          where: {
            organizationId: organization.id,
            projectId: project.id,
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
          await prisma.dealStage.update({
            where: { id: existing.id },
            data: stageData,
          })
        } else {
          await prisma.dealStage.create({
            data: {
              organizationId: organization.id,
              projectId: project.id,
              name: item.name,
              ...stageData,
            },
          })
        }
      }
      console.log(`Deal stages ensured for project: ${organization.slug}/${project.slug}`)
    }
  }
}
