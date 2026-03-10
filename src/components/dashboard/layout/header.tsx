'use client'

import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { HeaderActionsSlot } from './header-actions'
import { OrganizationStatusBadge } from '@/components/dashboard/organization/organization-status-badge'

// Route labels mapping (excluding /dashboard prefix)
const ROUTE_LABELS: Record<string, string> = {
  '': 'Visão Geral',
  leads: 'Leads',
  projects: 'Projetos',
  tickets: 'Tickets',
  sales: 'Vendas',
  items: 'Itens',
  'item-categories': 'Categorias',
  settings: 'Configurações',
  'settings/whatsapp': 'WhatsApp',
  'settings/whatsapp/webhooks': 'Webhook Meta',
  'settings/billing': 'Planos Billing',
  'settings/profile': 'Perfil',
  'settings/organization': 'Organização',
  'settings/team': 'Equipe',
  account: 'Minha Conta',
  'minha-conta': 'Minha Conta',
  equipe: 'Organização',
  'meta-ads': 'Meta Ads',
  chat: 'Chat',
  'send-test': 'Teste de Envio',
}

function getRouteLabel(segment: string, fullPath: string): string {
  // 1. Try full path from mapping
  if (ROUTE_LABELS[fullPath]) {
    return ROUTE_LABELS[fullPath]
  }
  // 2. Fall back to segment
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment]
  }
  // 3. Case-by-case friendly names
  if (segment === 'whatsapp') return 'WhatsApp'
  if (fullPath.startsWith('settings/whatsapp/') && /^[a-zA-Z0-9_-]{8,}$/.test(segment)) {
    return 'Instância'
  }

  // 4. Capitalize first letter as fallback
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

type BreadcrumbItemData = {
  label: string
  href: string
  isCurrentPage: boolean
}

function generateBreadcrumbs(pathname: string): BreadcrumbItemData[] {
  const withoutDashboard = pathname.replace(/^\/dashboard\/?/, '')

  if (!withoutDashboard) {
    return [{ label: 'Visão Geral', href: '/dashboard', isCurrentPage: true }]
  }

  const segments = withoutDashboard.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItemData[] = []

  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath += (currentPath ? '/' : '') + segment
    const isLast = index === segments.length - 1

    breadcrumbs.push({
      label: getRouteLabel(segment, currentPath),
      href: `/dashboard/${currentPath}`,
      isCurrentPage: isLast,
    })
  })

  return breadcrumbs
}

type DashboardHeaderProps = {
  hasOrganization?: boolean
  identityComplete?: boolean
}

export function DashboardHeader({ hasOrganization, identityComplete }: DashboardHeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="bg-background flex h-[65px] shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            // Check if this is the "settings" segment which shouldn't be clickable
            const isSettingsLink = item.href.endsWith('/settings')

            return (
              <Fragment key={item.href}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {item.isCurrentPage || isSettingsLink ? (
                    <BreadcrumbPage
                      className={`text-foreground font-semibold ${isSettingsLink ? 'cursor-default opacity-60' : ''}`}
                    >
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {hasOrganization !== undefined && identityComplete !== undefined && (
          <OrganizationStatusBadge
            hasOrganization={hasOrganization}
            identityComplete={identityComplete}
          />
        )}
        <HeaderActionsSlot />
      </div>
    </header>
  )
}
