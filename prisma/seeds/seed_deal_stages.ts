import type { PrismaClient } from '@generated/prisma/client'
import { DEFAULT_DEAL_STAGES } from '@/lib/constants/deal-stages'

export async function seedDealStages(prisma: PrismaClient) {
  console.log('Seeding deal stages...')

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' },
  })

  if (organizations.length === 0) {
    console.warn('⚠️ No organizations found. Deal stages not seeded.')
    return
  }

  for (const organization of organizations) {
    for (const stage of DEFAULT_DEAL_STAGES) {
      const existing = await prisma.dealStage.findFirst({
        where: {
          organizationId: organization.id,
          projectId: null,
          name: stage.name,
        },
      })

      if (existing) {
        await prisma.dealStage.update({
          where: { id: existing.id },
          data: {
            color: stage.color,
            order: stage.order,
            isDefault: stage.isDefault,
            isClosed: stage.isClosed,
          },
        })
      } else {
        await prisma.dealStage.create({
          data: {
            organizationId: organization.id,
            projectId: null,
            ...stage,
          },
        })
      }
    }

    console.log(`Deal stages ensured for organization: ${organization.name}`)
  }
}
