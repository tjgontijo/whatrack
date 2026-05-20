import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { isLaunchpadComplete } from '@/features/launchpad/services/get-launchpad-state'
import { logger } from '@/lib/utils/logger'

export async function resolveDefaultWorkspacePath(userId: string): Promise<string | null> {
  try {
    logger.debug({ userId }, '[resolve-default-workspace-path] start')

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
      logger.warn({ userId }, '[resolve-default-workspace-path] no member or org found')
      return null
    }

    logger.debug(
      { userId, organizationSlug: member.organization.slug },
      '[resolve-default-workspace-path] found organization'
    )

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
      logger.warn({ userId, organizationSlug: member.organization.slug }, '[resolve-default-workspace-path] no project found')
      return null
    }

    logger.debug(
      { userId, projectSlug: firstProject.slug },
      '[resolve-default-workspace-path] found project'
    )

    const basePath = `/${member.organization.slug}/${firstProject.slug}`

    const complete = await isLaunchpadComplete(member.organization.id, firstProject.id)
    logger.debug(
      { userId, launchpadComplete: complete, basePath },
      '[resolve-default-workspace-path] launchpad state checked'
    )

    if (!complete) {
      const launchpadPath = `${basePath}/launchpad`
      logger.debug({ userId, launchpadPath }, '[resolve-default-workspace-path] returning launchpad path')
      return launchpadPath
    }

    logger.debug({ userId, basePath }, '[resolve-default-workspace-path] returning dashboard path')
    return basePath
  } catch (error) {
    logger.error({ err: error, userId }, '[resolve-default-workspace-path] error')
    return null
  }
}
