import { prisma } from '@/lib/db/prisma'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'

export async function getWelcomeState(input: { userId: string }) {
  const organizationId = await getCurrentOrganizationId(input.userId)

  if (!organizationId) {
    return {
      organization: null,
      projects: [],
    }
  }

  const [organization, projects] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ])

  return {
    organization,
    projects,
  }
}
