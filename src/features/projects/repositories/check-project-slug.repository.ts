import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function checkProjectSlugAvailability(
  organizationId: string,
  slug: string,
  excludeProjectId?: string
) {
  const existing = await prisma.project.findFirst({
    where: {
      organizationId,
      slug,
      ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
    },
    select: { id: true },
  })

  return { available: !existing, slug }
}
