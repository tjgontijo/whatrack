import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function listTemplatesRepository() {
  return prisma.dealStageTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      icon: true,
      isPopular: true,
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
    orderBy: { name: 'asc' },
  })
}
