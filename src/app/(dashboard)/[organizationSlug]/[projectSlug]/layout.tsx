import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'

import { Toaster } from '@/components/ui/sonner'
import { DashboardTopbar } from '@/components/dashboard/layout/topbar'
import { DashboardShell } from '@/components/dashboard/layout/dashboard-shell'
import { ProjectClientContextSync } from '@/components/dashboard/project/project-client-context-sync'
import { ProjectRouteProvider } from '@/hooks/project/project-route-context'
import { prisma } from '@/lib/db/prisma'
import { resolveProjectContext } from '@/server/project/resolve-project-context'
import { getServerSession } from '@/server/auth/server-session'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'
import { isOrganizationIdentityComplete } from '@/server/organization/is-identity-complete'
import type { Permission } from '@/lib/auth/rbac/roles'

export const dynamic = 'force-dynamic'

interface ProjectScopedLayoutProps {
  children: ReactNode
  params: Promise<{
    organizationSlug: string
    projectSlug: string
  }>
}

export default async function ProjectScopedLayout({ children, params }: ProjectScopedLayoutProps) {
  const { organizationSlug, projectSlug } = await params
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  const context = await resolveProjectContext({
    organizationSlug,
    projectSlug,
    userId: session.user.id,
  })

  if (!context) {
    notFound()
  }

  const { organizationId, organizationName, organizationLogo, projectId, projectName } = context
  const projects = await prisma.project.findMany({
    where: {
      organizationId,
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { name: 'asc' },
  })

  const identityComplete = await isOrganizationIdentityComplete(organizationId)
  const effectivePermissions = await listEffectivePermissionsForUser({
    userId: session.user.id,
    organizationId,
  })
  const permissions = (effectivePermissions?.effectivePermissions ?? []) as Permission[]

  return (
    <ProjectRouteProvider value={context}>
      <ProjectClientContextSync projectId={projectId} />
      <div className="bg-sidebar flex h-screen flex-col overflow-hidden">
        <DashboardTopbar
          session={session}
          organizationName={organizationName}
          organizationLogo={organizationLogo}
          organizationSlug={organizationSlug}
          projectName={projectName}
          projectSlug={projectSlug}
          projects={projects}
          hasOrganization={true}
          identityComplete={identityComplete}
        />

        <DashboardShell
          session={session}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          organizationName={organizationName}
          projectId={projectId}
          projectSlug={projectSlug}
          projectName={projectName}
          projects={projects}
          permissions={permissions}
        >
          {children}
        </DashboardShell>
      </div>

      <Toaster richColors position="bottom-center" />
    </ProjectRouteProvider>
  )
}
