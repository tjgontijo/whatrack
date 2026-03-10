'use client'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  BarChart3,
  MessageSquare,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Inbox,
  ChevronRight,
  FileText,
  Webhook,
  Kanban,
  Sparkles,
  ShieldCheck,
  FolderKanban,
  CreditCard,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { WhatsAppIcon, MetaIcon } from '@/components/shared/icons'
import { authClient, useSession } from '@/lib/auth/auth-client'
import { isAdmin, isOwner } from '@/lib/auth/rbac/roles'
import { useAuthorization } from '@/hooks/auth/use-authorization'
import { UserDropdownMenu } from './user-dropdown-menu'

// Icon mapping for dynamic nav items
const ICON_MAP = {
  LayoutDashboard,
  Users,
  MessageSquare,
  Inbox,
  ShoppingBag,
  BarChart3,
  Meta: MetaIcon,
  WhatsApp: WhatsAppIcon,
  FileText,
  Webhook,
  ChevronRight,
  Kanban,
  Sparkles,
  ShieldCheck,
  FolderKanban,
  CreditCard,
} as const

type NavItem = {
  title: string
  href: string
  icon: string
}

type SidebarClientProps = {
  navItems: NavItem[]
  navigationLabel: string
  session?: any
}

export function SidebarClient({ navItems, session: initialSession }: SidebarClientProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const { data: clientSession } = useSession()
  const session = initialSession || clientSession
  const authorization = useAuthorization()

  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()

  const userName = session?.user?.name || 'Usuário'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image
  const organizationName = activeOrg?.name || organizations?.[0]?.name || ''

  // Handler to close sidebar on mobile when clicking a menu item
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Separate nav items into groups
  const overviewItems = navItems.filter((item) =>
    ['/dashboard', '/dashboard/analytics'].includes(item.href)
  )
  const acquisitionItems = navItems.filter((item) =>
    ['/dashboard/meta-ads', '/dashboard/whatsapp/inbox'].includes(item.href)
  )
  const crmItems = navItems.filter((item) =>
    ['/dashboard/projects', '/dashboard/leads', '/dashboard/tickets', '/dashboard/sales'].includes(
      item.href
    )
  )
  const intelligenceItems = navItems.filter((item) => item.href === '/dashboard/ia')

  const navPermissionByHref: Record<string, Parameters<typeof authorization.can>[0]> = {
    '/dashboard': 'view:dashboard',
    '/dashboard/analytics': 'view:analytics',
    '/dashboard/whatsapp/inbox': 'view:whatsapp',
    '/dashboard/projects': 'view:leads',
    '/dashboard/leads': 'view:leads',
    '/dashboard/ia': 'view:ai',
    '/dashboard/tickets': 'view:tickets',
    '/dashboard/sales': 'view:sales',
    '/dashboard/meta-ads': 'view:meta',
  }

  const isSuperAdmin = isOwner(session?.user?.role)
  const canManageBillingCatalog = isAdmin(session?.user?.role)
  const isWorkspaceAuthLoading = authorization.isLoading

  const canViewWorkspaceItem = (permission: Parameters<typeof authorization.can>[0]) =>
    isWorkspaceAuthLoading || authorization.can(permission)

  return (
    <Sidebar collapsible="icon">
      {/* Header with Logo */}
      <SidebarHeader className="h-[65px] justify-center border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link href="/dashboard">
                {/* Square logo (32x32) when collapsed */}
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src="/images/logo/logo_simble_dark_square.png"
                    alt="Whatrack"
                    width={20}
                    height={20}
                    className="size-5"
                  />
                </div>
                {/* Text only appears when expanded */}
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Whatrack</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {organizationName || 'Dashboard'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Overview section */}
        <SidebarGroup>
          <SidebarGroupLabel>Visão Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => {
                const requiredPermission = navPermissionByHref[item.href]
                if (requiredPermission && !canViewWorkspaceItem(requiredPermission)) {
                  return null
                }
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} onClick={handleNavClick}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Acquisition section */}
        <SidebarGroup>
          <SidebarGroupLabel>Captação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {acquisitionItems.map((item) => {
                const requiredPermission = navPermissionByHref[item.href]
                if (requiredPermission && !canViewWorkspaceItem(requiredPermission)) {
                  return null
                }
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} onClick={handleNavClick}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CRM section */}
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmItems.map((item) => {
                const requiredPermission = navPermissionByHref[item.href]
                if (requiredPermission && !canViewWorkspaceItem(requiredPermission)) {
                  return null
                }
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} onClick={handleNavClick}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Intelligence section */}
        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => {
                const requiredPermission = navPermissionByHref[item.href]
                if (requiredPermission && !canViewWorkspaceItem(requiredPermission)) {
                  return null
                }
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} onClick={handleNavClick}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System section - global SaaS */}
        {canManageBillingCatalog && (
          <SidebarGroup>
            <SidebarGroupLabel>Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Webhook Meta"
                      isActive={pathname.includes('/webhooks')}
                    >
                      <Link href="/dashboard/settings/whatsapp/webhooks" onClick={handleNavClick}>
                        <Webhook className="h-4 w-4" />
                        <span>Webhook Meta</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Design System"
                    isActive={pathname === '/dashboard/design-system'}
                  >
                    <Link href="/dashboard/design-system" onClick={handleNavClick}>
                      <FileText className="h-4 w-4" />
                      <span>Design System</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Planos e Cobrança"
                    isActive={pathname === '/dashboard/settings/billing'}
                  >
                    <Link href="/dashboard/settings/billing" onClick={handleNavClick}>
                      <CreditCard className="h-4 w-4" />
                      <span>Planos e Cobrança</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with User Menu */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserDropdownMenu userName={userName} userEmail={userEmail} userImage={userImage} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Resize rail - VS Code style */}
      <SidebarRail />
    </Sidebar>
  )
}
