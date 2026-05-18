import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findActiveProjectsForOrg(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId, isArchived: false },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })
}
