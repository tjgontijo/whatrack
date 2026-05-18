import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function findProjectInOrg(projectId: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true, name: true },
  })
}
