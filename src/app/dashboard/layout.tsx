import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { Toaster } from '@/components/ui/sonner'
import { prisma } from '@/lib/db/prisma'
import { DashboardContent } from '@/components/dashboard/layout/dashboard-content'
import { DashboardHeader } from '@/components/dashboard/layout/header'
import { HeaderActionsProvider } from '@/components/dashboard/layout/header-actions'
import { OrganizationSelectorGate } from '@/components/dashboard/organization/organization-selector'
import { OnboardingDialog } from '@/components/dashboard/organization/onboarding-dialog'
import { ProjectContextGate } from '@/components/dashboard/projects/project-context-gate'
import { DashboardSidebar } from '@/components/dashboard/sidebar/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getServerSession } from '@/server/auth/server-session'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'
import { isOrganizationIdentityComplete } from '@/server/organization/is-identity-complete'
import { getCurrentProjectId } from '@/server/project/get-current-project-id'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  let organizationId = await getCurrentOrganizationId(session.user.id)

  if (organizationId) {
    const membership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
      },
      select: { id: true },
    })

    if (!membership) {
      organizationId = null
    }
  }

  if (!organizationId) {
    const firstMembership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    })

    organizationId = firstMembership?.organizationId ?? null
  }

  let hasOrganization = false
  let identityComplete = false
  let projects: Array<{ id: string; name: string }> = []
  let activeProjectId: string | null = null

  if (organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    })

    if (organization) {
      hasOrganization = true
      identityComplete = await isOrganizationIdentityComplete(organizationId)
      activeProjectId = await getCurrentProjectId(organizationId)
      projects = await prisma.project.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      })
    }
  }

  return (
    <HeaderActionsProvider>
      <SidebarProvider>
        <div className="bg-background flex min-h-screen w-full">
          <DashboardSidebar session={session} />

          <SidebarInset className="min-w-0">
            <DashboardHeader hasOrganization={hasOrganization} identityComplete={identityComplete} />

            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
              <DashboardContent>
                <div className="mx-auto w-full min-w-0">
                  {hasOrganization ? <OrganizationSelectorGate /> : null}
                  {hasOrganization && organizationId ? (
                    <ProjectContextGate
                      organizationId={organizationId}
                      projects={projects}
                      activeProjectId={activeProjectId}
                    />
                  ) : null}
                  {children}
                </div>
              </DashboardContent>
            </main>

            <OnboardingDialog open={!hasOrganization} />
          </SidebarInset>
        </div>

        <Toaster richColors position="bottom-center" />
      </SidebarProvider>
    </HeaderActionsProvider>
  )
}
