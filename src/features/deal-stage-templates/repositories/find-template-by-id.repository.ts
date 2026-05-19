import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findTemplateByIdRepository(id: string) {
  return prisma.dealStageTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      icon: true,
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
  })
}
