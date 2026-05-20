import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { isLaunchpadComplete } from '@/features/launchpad/services/get-launchpad-state'
import { logger } from '@/lib/utils/logger'

export async function resolveDefaultWorkspacePath(userId: string): Promise<string | null> {
  try {
    const member = await prisma.member.findFirst({
      where: { userId },
      select: {
        organization: {
          select: {
            id: true,
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
        id: true,
        slug: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!firstProject?.slug) {
      return null
    }

    const basePath = `/${member.organization.slug}/${firstProject.slug}`

    const complete = await isLaunchpadComplete(member.organization.id, firstProject.id)
    if (!complete) {
      return `${basePath}/launchpad`
    }

    return basePath
  } catch (error) {
    logger.error({ err: error, userId }, '[resolve-default-workspace-path] error')
    return null
  }
}
