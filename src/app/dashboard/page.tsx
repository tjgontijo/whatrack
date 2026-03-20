import { redirect } from 'next/navigation'

import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/server/auth/server-session'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'
import { getCurrentProjectId } from '@/server/project/get-current-project-id'

export const dynamic = 'force-dynamic'

export default async function DashboardEntryPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  const organizationId = await getCurrentOrganizationId(session.user.id)

  if (!organizationId) {
    redirect('/welcome')
  }

  const [organization, project] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    }),
    (async () => {
      const currentProjectId = await getCurrentProjectId(organizationId)

      if (currentProjectId) {
        const currentProject = await prisma.project.findFirst({
          where: {
            id: currentProjectId,
            organizationId,
            isArchived: false,
          },
          select: { slug: true },
        })

        if (currentProject) {
          return currentProject
        }
      }

      return prisma.project.findFirst({
        where: {
          organizationId,
          isArchived: false,
        },
        orderBy: { createdAt: 'asc' },
        select: { slug: true },
      })
    })(),
  ])

  if (!organization || !project) {
    redirect('/welcome')
  }

  redirect(`/${organization.slug}/${project.slug}`)
}
