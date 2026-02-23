import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { Toaster } from '@/components/ui/sonner'
import { getServerSession } from '@/server/auth/server-session'
import { prisma } from '@/lib/prisma'
import { getCurrentOrganizationId } from '@/server/organization/get-current-organization-id'

import { DashboardSidebar } from '@/components/dashboard/sidebar/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { HeaderActionsProvider } from '@/components/dashboard/header-actions'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { OrganizationSelectorGate } from '@/components/dashboard/organization-selector'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const dynamic = 'force-dynamic'

const onboardingStatuses = [
  { name: 'pending', description: 'Onboarding iniciado e aguardando conclusão.' },
  { name: 'completed', description: 'Onboarding concluído com sucesso.' },
  { name: 'skipped', description: 'Onboarding pulado pelo usuário.' },
] as const

async function ensureOnboardingStatuses() {
  await Promise.all(
    onboardingStatuses.map((status) =>
      prisma.onboardingStatus.upsert({
        where: { name: status.name },
        create: status,
        update: {},
      })
    )
  )
}

async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const normalizedBase = baseSlug || 'organizacao'
  const existing = await prisma.organization.findUnique({
    where: { slug: normalizedBase },
    select: { id: true },
  })

  if (!existing) return normalizedBase

  return `${normalizedBase}-${Math.random().toString(36).substring(2, 8)}`
}

async function ensureUserOrganization(user: { id: string; name?: string | null; email?: string | null }) {
  const existingMembership = await prisma.member.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (existingMembership?.organizationId) {
    return existingMembership.organizationId
  }

  await ensureOnboardingStatuses()

  const fallbackName = user.name?.trim() || (user.email?.split('@')[0] ?? '').trim() || 'Minha organizacao'
  const slug = await generateUniqueSlug(fallbackName)

  const organization = await prisma.organization.create({
    data: {
      name: fallbackName,
      slug,
      createdAt: new Date(),
    },
  })

  await prisma.organizationProfile.create({
    data: {
      organizationId: organization.id,
      onboardingStatus: 'skipped',
    },
  })

  await prisma.member.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
      createdAt: new Date(),
    },
  })

  return organization.id
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/sign-in')

  let organizationId = await getCurrentOrganizationId(session.user.id)
  if (!organizationId) {
    organizationId = await ensureUserOrganization({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    })
  }

  // Garante que o user pertence à org ativa (impede header/cookie forjado)
  let membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId },
    select: { role: true },
  })

  if (!membership) {
    organizationId = await ensureUserOrganization({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    })
    membership = await prisma.member.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true },
    })
  }

  if (!membership) redirect('/sign-in')

  let organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { profile: true },
  })

  if (!organization) {
    organizationId = await ensureUserOrganization({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    })
    organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { profile: true },
    })
  }

  if (!organization) redirect('/sign-in')

  return (
    <HeaderActionsProvider>
      <SidebarProvider>
        <div className="bg-background flex min-h-screen w-full">
          <DashboardSidebar />

          <SidebarInset className="min-w-0">
            <DashboardHeader />

            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
              <DashboardContent>
                <div className="mx-auto w-full min-w-0">
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
