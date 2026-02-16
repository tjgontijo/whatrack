import type { PrismaClient } from '../generated/prisma/client'
import { DEFAULT_TICKET_STAGES } from '../../src/services/tickets/ensure-ticket-stages'

export async function seedTicketStages(prisma: PrismaClient) {
  console.log('Seeding ticket stages...')

  let organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' },
  })

  if (organizations.length === 0) {
    console.log('No organizations found. Creating default organization for seeds...')

    const ownerEmail = process.env.OWNER_EMAIL || 'admin@whatrack.com'
    const baseSlug = ownerEmail.split('@')[0]

    const organization = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: baseSlug,
      },
    })

    organizations = [organization]
  }

  for (const organization of organizations) {
    for (const stage of DEFAULT_TICKET_STAGES) {
      await prisma.ticketStage.upsert({
        where: {
          organizationId_name: {
            organizationId: organization.id,
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
          ...stage,
        },
      })
    }

    console.log(`Ticket stages ensured for organization: ${organization.name}`)
  }
}
