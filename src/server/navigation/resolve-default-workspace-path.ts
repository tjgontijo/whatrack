import 'server-only'

import { prisma } from '@/lib/db/prisma'

export async function resolveDefaultWorkspacePath(userId: string): Promise<string | null> {
  const member = await prisma.member.findFirst({
    where: { userId },
    select: {
      organization: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!member?.organization.slug) {
    return null
  }

  const firstProject = await prisma.project.findFirst({
    where: {
      organization: {
        slug: member.organization.slug,
      },
      isArchived: false,
    },
    select: {
      slug: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!firstProject?.slug) {
    return null
  }

  return `/${member.organization.slug}/${firstProject.slug}`
}
