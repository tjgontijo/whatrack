import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { Toaster } from '@/components/ui/sonner'
import { getServerSession } from '@/lib/auth/server-session'
import { prisma } from '@/lib/prisma'
import { DashboardSidebar } from '@/components/dashboard/sidebar/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { HeaderActionsProvider } from '@/components/dashboard/header-actions'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { OrganizationSelectorGate } from '@/components/dashboard/organization-selector'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

// Dashboard routes são dinâmicas (usam autenticação via cookies)
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Server-side authentication check
  const session = await getServerSession()

  if (!session) {
    redirect('/sign-in')
  }

  // Obter organização do usuário com profile
  const organization = await prisma.organization.findFirst({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      profile: true,
    },
  })

  return (
    <HeaderActionsProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <DashboardSidebar />

          <SidebarInset>
            <DashboardHeader />

            <main className="flex-1 overflow-y-auto p-6">
              <DashboardContent 
                organization={organization}
                userId={session.user.id}
              >
                <div className="mx-auto w-full space-y-6">
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
