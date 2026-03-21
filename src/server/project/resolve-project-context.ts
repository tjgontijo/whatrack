import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export interface ProjectContext {
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationLogo?: string | null
  projectId: string
  projectSlug: string
  projectName: string
}

export interface OrganizationContext {
  organizationId: string
  organizationSlug: string
  organizationName: string
  organizationLogo?: string | null
}

export async function resolveProjectContext(params: {
  organizationSlug: string
  projectSlug: string
  userId: string
}): Promise<ProjectContext | null> {
  try {
    const member = await prisma.member.findFirst({
      where: {
        userId: params.userId,
        organization: {
          slug: params.organizationSlug,
        },
      },
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
          },
        },
      },
    })

    if (!member) {
      logger.debug('[resolveProjectContext] User is not a member of the organization')
      return null
    }

    const project = await prisma.project.findFirst({
      where: {
        organizationId: member.organizationId,
        slug: params.projectSlug,
        isArchived: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })

    if (!project) {
      logger.debug('[resolveProjectContext] Project not found or archived')
      return null
    }

    return {
      organizationId: member.organization.id,
      organizationSlug: member.organization.slug,
      organizationName: member.organization.name,
      organizationLogo: member.organization.logo,
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
    }
  } catch (error) {
    logger.error({ err: error }, '[resolveProjectContext] Error resolving project context')
    return null
  }
}

export async function resolveOrganizationContext(params: {
  organizationSlug: string
  userId: string
}): Promise<OrganizationContext | null> {
  try {
    const member = await prisma.member.findFirst({
      where: {
        userId: params.userId,
        organization: {
          slug: params.organizationSlug,
        },
      },
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
          },
        },
      },
    })

    if (!member) {
      return null
    }

    return {
      organizationId: member.organization.id,
      organizationSlug: member.organization.slug,
      organizationName: member.organization.name,
      organizationLogo: member.organization.logo,
    }
  } catch (error) {
    logger.error(
      { err: error },
      '[resolveOrganizationContext] Error resolving organization context'
    )
    return null
  }
}

export async function resolveProjectContextById(params: {
  organizationSlug: string
  projectId: string
  userId: string
}): Promise<ProjectContext | null> {
  try {
    const member = await prisma.member.findFirst({
      where: {
        userId: params.userId,
        organization: {
          slug: params.organizationSlug,
        },
      },
      select: {
        organizationId: true,
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
          },
        },
      },
    })

    if (!member) {
      return null
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        organizationId: member.organizationId,
        isArchived: false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })

    if (!project) {
      return null
    }

    return {
      organizationId: member.organization.id,
      organizationSlug: member.organization.slug,
      organizationName: member.organization.name,
      organizationLogo: member.organization.logo,
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
    }
  } catch (error) {
    logger.error(
      { err: error },
      '[resolveProjectContextById] Error resolving project context by ID'
    )
    return null
  }
}
