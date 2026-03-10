'use client'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  BarChart3,
  CreditCard,
  MessageSquare,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
  User,
  Inbox,
  ChevronRight,
  FileText,
  Smartphone,
  Webhook,
  Kanban,
  Sparkles,
  ShieldCheck,
  FolderKanban,
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
  User,
  MessageSquare,
  Inbox,
  ShoppingBag,
  Package,
  BarChart3,
  Meta: MetaIcon,
  WhatsApp: WhatsAppIcon,
  Settings,
  CreditCard,
  FileText,
  Smartphone,
  Webhook,
  ChevronRight,
  Kanban,
  Sparkles,
  ShieldCheck,
  FolderKanban,
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
  const platformItems = navItems.filter((item) =>
    ['LayoutDashboard', 'MessageSquare', 'Sparkles'].includes(item.icon)
  )

  const dataItems = navItems.filter((item) =>
    ['FolderKanban', 'Users', 'Kanban', 'ShoppingBag', 'Package', 'Meta'].includes(item.icon)
  )

  const navPermissionByHref: Record<string, Parameters<typeof authorization.can>[0]> = {
    '/dashboard': 'view:dashboard',
    '/dashboard/analytics': 'view:analytics',
    '/dashboard/whatsapp/inbox': 'view:whatsapp',
    '/dashboard/projects': 'view:leads',
    '/dashboard/leads': 'view:leads',
    '/dashboard/approvals': 'view:ai',
    '/dashboard/tickets': 'view:tickets',
    '/dashboard/sales': 'view:sales',
    '/dashboard/items': 'view:items',
    '/dashboard/item-categories': 'view:items',
    '/dashboard/meta-ads/campaigns': 'view:meta',
  }

  const isSuperAdmin = isOwner(session?.user?.role)
  const canManageBillingCatalog = isAdmin(session?.user?.role)
  const isWorkspaceAuthLoading = authorization.isLoading

  const canViewWorkspaceItem = (permission: Parameters<typeof authorization.can>[0]) =>
    isWorkspaceAuthLoading || authorization.can(permission)

  const canViewOrganizationSettings =
    isWorkspaceAuthLoading ||
    authorization.isAdmin ||
    authorization.can('manage:organization') ||
    authorization.can('manage:members')

  const canViewBilling =
    isWorkspaceAuthLoading ||
    authorization.isOwner ||
    authorization.can('manage:organization')

  const isWhatsAppActive = pathname.startsWith('/dashboard/settings/whatsapp')

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
        {/* Platform section - Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformItems.map((item) => {
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

              {/* ROI Meta Ads Item */}
              {canViewWorkspaceItem('view:meta') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="ROI Meta Ads"
                    isActive={pathname === '/dashboard/meta-ads'}
                  >
                    <Link href="/dashboard/meta-ads" onClick={handleNavClick}>
                      <BarChart3 className="h-4 w-4" />
                      <span>ROI Meta Ads</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Data section - Leads, Sales, etc */}
        <SidebarGroup>
          <SidebarGroupLabel>Dados</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) => {
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

        {/* Account & Billing section */}
        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {canViewBilling && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Assinatura"
                    isActive={pathname === '/dashboard/billing'}
                  >
                    <Link href="/dashboard/billing" onClick={handleNavClick}>
                      <CreditCard className="h-4 w-4" />
                      <span>Assinatura</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Config section */}
        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Minha Conta"
                  isActive={pathname === '/dashboard/account'}
                >
                  <Link href="/dashboard/account" onClick={handleNavClick}>
                    <User className="h-4 w-4" />
                    <span>Minha Conta</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {canViewOrganizationSettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Organização"
                    isActive={pathname === '/dashboard/equipe' || pathname.startsWith('/dashboard/equipe/')}
                  >
                    <Link href="/dashboard/equipe" onClick={handleNavClick}>
                      <Users className="h-4 w-4" />
                      <span>Organização</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* WhatsApp Item */}
              {canViewWorkspaceItem('manage:integrations') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="WhatsApp"
                    isActive={isWhatsAppActive && !pathname.includes('/webhooks')}
                  >
                    <Link href="/dashboard/settings/whatsapp" onClick={handleNavClick}>
                      <ICON_MAP.WhatsApp className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Meta Ads Item */}
              {canViewWorkspaceItem('manage:integrations') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Meta Ads"
                    isActive={pathname.startsWith('/dashboard/settings/meta-ads')}
                  >
                    <Link href="/dashboard/settings/meta-ads" onClick={handleNavClick}>
                      <ICON_MAP.Meta className="h-4 w-4" />
                      <span>Meta Ads</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Pipeline Item */}
              {canViewWorkspaceItem('manage:settings') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Pipeline"
                    isActive={pathname === '/dashboard/settings/pipeline'}
                  >
                    <Link href="/dashboard/settings/pipeline" onClick={handleNavClick}>
                      <Kanban className="h-4 w-4" />
                      <span>Pipeline</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* IA Copilot Settings */}
              {canViewWorkspaceItem('manage:ai') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="AI Studio Beta"
                    isActive={pathname === '/dashboard/settings/ai'}
                  >
                    <Link href="/dashboard/settings/ai" onClick={handleNavClick}>
                      <Sparkles className="h-4 w-4" />
                      <span>AI Studio Beta</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Audit Logs Settings */}
              {canViewWorkspaceItem('view:audit') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Logs de Auditoria"
                    isActive={pathname === '/dashboard/settings/audit-logs'}
                  >
                    <Link href="/dashboard/settings/audit-logs" onClick={handleNavClick}>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Auditoria</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Webhook Meta Item (Only for Super Admin) */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section - Design System (Only for Super Admin) */}
        {canManageBillingCatalog && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
                    tooltip="Planos Billing"
                    isActive={pathname === '/dashboard/settings/billing'}
                  >
                    <Link href="/dashboard/settings/billing" onClick={handleNavClick}>
                      <CreditCard className="h-4 w-4" />
                      <span>Planos Billing</span>
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
