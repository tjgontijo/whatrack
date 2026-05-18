import type { PrismaClient } from '@generated/prisma/client'
import { DEFAULT_DEAL_STAGES } from '@/lib/constants/deal-stages'

export async function seedDealStages(prisma: PrismaClient) {
  console.log('Seeding ticket stages...')

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' },
  })

  if (organizations.length === 0) {
    console.warn('⚠️ No organizations found. Ticket stages not seeded.')
    return
  }

  for (const organization of organizations) {
    for (const stage of DEFAULT_DEAL_STAGES) {
      // Check if stage exists first
      const existingStage = await prisma.dealStage.findFirst({
        where: {
          organizationId: organization.id,
          projectId: null,
          name: stage.name,
        },
      })

      if (existingStage) {
        // Update existing stage
        await prisma.dealStage.update({
          where: { id: existingStage.id },
          data: {
            color: stage.color,
            order: stage.order,
            isDefault: stage.isDefault,
            isClosed: stage.isClosed,
          },
        })
      } else {
        // Create new stage
        await prisma.dealStage.create({
          data: {
            organizationId: organization.id,
            projectId: null,
            ...stage,
          },
        })
      }
    }

    console.log(`Ticket stages ensured for organization: ${organization.name}`)
  }
}
