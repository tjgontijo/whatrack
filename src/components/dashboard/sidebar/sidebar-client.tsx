'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Users,
  Plug,
  UserCircle,
  Building2,
  GitBranch,
  Bot,
  Package,
  ScrollText,
  CreditCard,
  Paintbrush,
  Webhook,
} from 'lucide-react'

import type { Permission } from '@/lib/auth/rbac/roles'
import { MetaIcon, WhatsAppIcon } from '@/components/shared/icons'
import { ProjectSelector } from '@/components/dashboard/projects/project-selector'
import { UserDropdownMenu } from '@/components/dashboard/sidebar/user-dropdown-menu'
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
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { apiFetch } from '@/lib/api-client'

const ICON_MAP = {
  LayoutDashboard,
  Users,
  MessageSquare,
  ShoppingBag,
  BarChart3,
  Meta: MetaIcon,
  WhatsApp: WhatsAppIcon,
  Kanban,
  Sparkles,
  FolderKanban,
  Plug,
  UserCircle,
  Building2,
  GitBranch,
  Bot,
  Package,
  ScrollText,
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
  organizationId: string
  organizationName: string
  projects: Array<{ id: string; name: string }>
  activeProjectId: string | null
  permissions: Permission[]
}

export function SidebarClient({
  navItems,
  session,
  organizationId,
  organizationName,
  projects,
  activeProjectId,
  permissions,
}: SidebarClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isMobile, setOpenMobile } = useSidebar()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId)
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  const userName = session?.user?.name || 'Usuário'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image

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

  const navPermissionByHref: Partial<Record<string, Permission>> = {
    '/dashboard': 'view:dashboard',
    '/dashboard/analytics': 'view:analytics',
    '/dashboard/whatsapp/inbox': 'view:whatsapp',
    '/dashboard/meta-ads': 'view:meta',
    '/dashboard/projects': 'view:leads',
    '/dashboard/leads': 'view:leads',
    '/dashboard/tickets': 'view:tickets',
    '/dashboard/sales': 'view:sales',
    '/dashboard/ia': 'view:ai',
  }

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const canViewWorkspaceItem = (permission: Permission) => permissionSet.has(permission)

  const projectMutation = useMutation({
    mutationFn: (projectId: string | null) =>
      apiFetch('/api/v1/projects/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
        orgId: organizationId,
      }),
    onMutate: (projectId) => {
      setSelectedProjectId(projectId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      router.refresh()
    },
    onError: () => {
      setSelectedProjectId(activeProjectId)
    },
  })

  const renderNavGroup = (items: NavItem[], exact = false) =>
    items.map((item) => {
      const requiredPermission = navPermissionByHref[item.href]
      if (requiredPermission && !canViewWorkspaceItem(requiredPermission)) {
        return null
      }

      const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
      const isActive = exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`)

      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
            <Link href={item.href} onClick={handleNavClick}>
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src="/images/logo/logo_simble_dark_square.png"
                    alt="Whatrack"
                    width={20}
                    height={20}
                    className="size-5"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">Whatrack</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {organizationName || 'Workspace'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 pt-3 pb-2 group-data-[collapsible=icon]:hidden">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Projeto ativo
          </p>
          <ProjectSelector
            organizationId={organizationId}
            value={selectedProjectId}
            onChange={(projectId) => projectMutation.mutate(projectId)}
            placeholder="Todos os projetos"
            disabled={projectMutation.isPending}
            className="h-9 rounded-lg text-xs"
            projects={projects}
          />
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Visão Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavGroup(overviewItems, true)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Captação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavGroup(acquisitionItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavGroup(crmItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavGroup(intelligenceItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/dashboard/settings' ||
                    pathname.startsWith('/dashboard/settings/profile')
                  }
                  tooltip="Perfil"
                >
                  <Link href="/dashboard/settings/profile" onClick={handleNavClick}>
                    <UserCircle className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

{canViewWorkspaceItem('manage:organization') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/organization')}
                    tooltip="Organização"
                  >
                    <Link href="/dashboard/settings/organization" onClick={handleNavClick}>
                      <Building2 className="h-4 w-4" />
                      <span>Organização</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {canViewWorkspaceItem('manage:members') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/team')}
                    tooltip="Equipe"
                  >
                    <Link href="/dashboard/settings/team" onClick={handleNavClick}>
                      <Users className="h-4 w-4" />
                      <span>Equipe</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {canViewWorkspaceItem('manage:integrations') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname.startsWith('/dashboard/settings/integrations') ||
                      pathname.startsWith('/dashboard/settings/whatsapp') ||
                      pathname.startsWith('/dashboard/settings/meta-ads')
                    }
                    tooltip="Integrações"
                  >
                    <Link href="/dashboard/settings/integrations" onClick={handleNavClick}>
                      <Plug className="h-4 w-4" />
                      <span>Integrações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {canViewWorkspaceItem('manage:settings') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/pipeline')}
                    tooltip="Pipeline"
                  >
                    <Link href="/dashboard/settings/pipeline" onClick={handleNavClick}>
                      <GitBranch className="h-4 w-4" />
                      <span>Pipeline</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {canViewWorkspaceItem('manage:ai') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/ai-studio')}
                    tooltip="IA Studio"
                  >
                    <Link href="/dashboard/settings/ai-studio" onClick={handleNavClick}>
                      <Bot className="h-4 w-4" />
                      <span>IA Studio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {canViewWorkspaceItem('manage:items') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/catalog')}
                    tooltip="Catálogo"
                  >
                    <Link href="/dashboard/settings/catalog" onClick={handleNavClick}>
                      <Package className="h-4 w-4" />
                      <span>Catálogo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname.startsWith('/dashboard/settings/subscription') ||
                    pathname.startsWith('/dashboard/settings/billing')
                  }
                  tooltip="Assinatura"
                >
                  <Link href="/dashboard/settings/subscription" onClick={handleNavClick}>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Assinatura</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {canViewWorkspaceItem('view:audit') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/audit')}
                    tooltip="Auditoria"
                  >
                    <Link href="/dashboard/settings/audit" onClick={handleNavClick}>
                      <ScrollText className="h-4 w-4" />
                      <span>Auditoria</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(session?.user?.role === 'admin' || session?.user?.role === 'owner') ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/webhooks')}
                    tooltip="Webhooks"
                  >
                    <Link href="/dashboard/settings/webhooks/whatsapp" onClick={handleNavClick}>
                      <Webhook className="h-4 w-4" />
                      <span>Webhooks</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/settings/billing')}
                    tooltip="Planos e Cobrança"
                  >
                    <Link href="/dashboard/settings/billing" onClick={handleNavClick}>
                      <CreditCard className="h-4 w-4" />
                      <span>Planos e Cobrança</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {session?.user?.role === 'owner' ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/dashboard/design-system')}
                      tooltip="Design System"
                    >
                      <Link href="/dashboard/design-system" onClick={handleNavClick}>
                        <Paintbrush className="h-4 w-4" />
                        <span>Design System</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserDropdownMenu userName={userName} userEmail={userEmail} userImage={userImage} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
