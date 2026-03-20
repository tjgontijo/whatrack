import { redirect } from 'next/navigation'

import { prisma } from '@/lib/db/prisma'
import { normalizeSlug } from '@/lib/utils/slug'
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
      select: { id: true, slug: true, name: true },
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

  let organizationSlug = organization.slug

  if (organization.slug.startsWith('org-')) {
    const baseSlug = normalizeSlug(organization.name) || organization.slug

    for (let index = 0; index < 100; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 2}`
      const existing = await prisma.organization.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })

      if (!existing || existing.id === organization.id) {
        if (candidate !== organization.slug) {
          await prisma.organization.update({
            where: { id: organization.id },
            data: { slug: candidate },
          })
          organizationSlug = candidate
        }
        break
      }
    }
  }

  redirect(`/${organizationSlug}/${project.slug}`)
}
