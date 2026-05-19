import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function listTemplatesRepository(organizationId?: string, projectId?: string) {
  return prisma.dealStageTemplate.findMany({
    where: {
      OR: [
        { isPersonal: false },
        ...(organizationId && projectId
          ? [{ isPersonal: true, organizationId, projectId }]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      icon: true,
      isPopular: true,
      isPersonal: true,
      items: {
        select: {
          id: true,
          name: true,
          color: true,
          order: true,
          statusGroup: true,
          probability: true,
          suggestedMetaEventName: true,
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ isPersonal: 'asc' }, { name: 'asc' }],
  })
}
