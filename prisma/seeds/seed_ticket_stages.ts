import type { PrismaClient } from '@generated/prisma/client'
import { DEFAULT_TICKET_STAGES } from '@/lib/constants/ticket-stages'

export async function seedTicketStages(prisma: PrismaClient) {
  console.log('Seeding ticket stages...')

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' },
  })

  if (organizations.length === 0) {
    console.warn('⚠️ No organizations found. Ticket stages not seeded.')
    return
  }

  for (const organization of organizations) {
    for (const stage of DEFAULT_TICKET_STAGES) {
      await prisma.ticketStage.upsert({
        where: {
          organizationId_projectId_name: {
            organizationId: organization.id,
            projectId: null,
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
          organizationId: organization.id,
          projectId: null,
          ...stage,
        },
      })
    }

    console.log(`Ticket stages ensured for organization: ${organization.name}`)
  }
}
