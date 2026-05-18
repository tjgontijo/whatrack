import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findWhatsAppDebugData(organizationId: string, projectId: string) {
  const [configs, connections, onboardings] = await Promise.all([
    prisma.whatsAppConfig.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.whatsAppConnection.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.whatsAppOnboarding.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { configs, connections, onboardings }
}
