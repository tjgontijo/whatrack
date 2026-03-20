import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'

import { Toaster } from '@/components/ui/sonner'
import { DashboardContent } from '@/components/dashboard/layout/dashboard-content'
import { DashboardHeader } from '@/components/dashboard/layout/header'
import { HeaderActionsProvider } from '@/components/dashboard/layout/header-actions'
import { ProjectClientContextSync } from '@/components/dashboard/project/project-client-context-sync'
import { ProjectScopedSidebar } from '@/components/dashboard/sidebar/project-scoped-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
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

  const { organizationId, organizationName, projectId, projectName } = context
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
    <HeaderActionsProvider>
      <ProjectRouteProvider value={context}>
        <ProjectClientContextSync projectId={projectId} />
        <SidebarProvider>
          <div className="bg-background flex min-h-screen w-full">
            <ProjectScopedSidebar
              session={session}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              organizationName={organizationName}
              projectId={projectId}
              projectSlug={projectSlug}
              projectName={projectName}
              projects={projects}
              permissions={permissions}
            />

            <SidebarInset className="min-w-0">
              <DashboardHeader hasOrganization={true} identityComplete={identityComplete} />

              <main className="3xl:px-6 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
                <DashboardContent>
                  <div className="max-w-screen-4xl mx-auto w-full min-w-0">{children}</div>
                </DashboardContent>
              </main>
            </SidebarInset>
          </div>

          <Toaster richColors position="bottom-center" />
        </SidebarProvider>
      </ProjectRouteProvider>
    </HeaderActionsProvider>
  )
}
