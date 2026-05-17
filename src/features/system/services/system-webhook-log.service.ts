import { prisma } from '@/lib/db/prisma'

export async function listSystemWebhookLogs() {
  const [logs, distinctEventTypes] = await Promise.all([
    prisma.whatsAppWebhookLog.findMany({
      include: {
        organization: {
          select: {
            name: true,
            whatsappConfig: {
              select: {
                phoneId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    }),
    prisma.whatsAppWebhookLog.findMany({
      distinct: ['eventType'],
      select: {
        eventType: true,
      },
      where: {
        eventType: { not: null },
      },
    }),
  ])

  return {
    logs,
    eventTypes: distinctEventTypes.map((entry) => entry.eventType),
  }
}
