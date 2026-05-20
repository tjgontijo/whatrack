import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { DashboardShell } from '@/features/dashboard/components/layout/dashboard-shell'
import { DashboardTopbar } from '@/features/dashboard/components/layout/topbar'
import { ProjectClientContextSync } from '@/features/dashboard/components/project/project-client-context-sync'
import { ProjectRouteProvider } from '@/features/projects/contexts/project-route.context'
import { findActiveProjectsForOrg } from '@/features/projects/repositories/find-projects-for-org.repository'
import { isLaunchpadComplete } from '@/features/launchpad/services/get-launchpad-state'
import type { Permission } from '@/lib/auth/rbac/roles'
import { getServerSession } from '@/server/auth/server-session'
import { isOrganizationIdentityComplete } from '@/server/organization/is-identity-complete'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'
import { resolveProjectContext } from '@/server/project/resolve-project-context'


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
  const projects = await findActiveProjectsForOrg(organizationId)

  const identityComplete = await isOrganizationIdentityComplete(organizationId)
  const effectivePermissions = await listEffectivePermissionsForUser({
    userId: session.user.id,
    organizationId,
  })
  const permissions = (effectivePermissions?.effectivePermissions ?? []) as Permission[]
  const launchpadComplete = await isLaunchpadComplete(organizationId, projectId)

  return (
    <ProjectRouteProvider value={context}>
      <ProjectClientContextSync projectId={projectId} />
      <div className='flex h-screen flex-col overflow-hidden bg-sidebar'>
        <DashboardTopbar
          session={session}
          organizationName={organizationName}
          organizationLogo={organizationLogo}
          organizationSlug={organizationSlug}
          projectName={projectName}
          projectSlug={projectSlug}
          projects={projects}
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
          showLaunchpad={!launchpadComplete}
        >
          {children}
        </DashboardShell>
      </div>

      <Toaster richColors position='bottom-center' />
    </ProjectRouteProvider>
  )
}
