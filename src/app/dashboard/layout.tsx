import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { Toaster } from '@/components/ui/sonner'
import { getServerSession } from '@/server/auth/server-session'
import { prisma } from '@/lib/prisma'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'
import { isOrganizationComplete } from '@/server/organization/is-organization-complete'

import { DashboardSidebar } from '@/components/dashboard/sidebar/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { HeaderActionsProvider } from '@/components/dashboard/header-actions'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { OrganizationSelectorGate } from '@/components/dashboard/organization-selector'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  const organizationId = await getCurrentOrganizationId(session.user.id)
  if (!organizationId) redirect('/onboarding')

  // Garante que o user pertence à org ativa (impede header/cookie forjado)
  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId },
    select: { role: true },
  })
  if (!membership) redirect('/onboarding')

  // Verifica se a organização existe e tem onboarding completo
  const isComplete = await isOrganizationComplete(organizationId)
  if (!isComplete) redirect('/onboarding')

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { profile: true },
  })
  if (!organization) redirect('/onboarding')

  return (
    <HeaderActionsProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <DashboardSidebar />

          <SidebarInset>
            <DashboardHeader />

            <main className="flex-1 overflow-y-auto px-4 py-2">
              <DashboardContent
                organization={organization}
                userId={session.user.id}
              >
                <div className="mx-auto w-full">
                  <OrganizationSelectorGate />
                  {children}
                </div>
              </DashboardContent>
            </main>
          </SidebarInset>
        </div>

        <Toaster richColors position="bottom-center" />
      </SidebarProvider>
    </HeaderActionsProvider>
  )
}
