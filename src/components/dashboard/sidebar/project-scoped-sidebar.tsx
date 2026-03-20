'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  FolderKanban,
  GitBranch,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Package,
  Paintbrush,
  Plug,
  ScrollText,
  ShoppingBag,
  Sparkles,
  UserCircle,
  Users,
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

const ICON_MAP = {
  LayoutDashboard,
  Users,
  MessageSquare,
  Megaphone,
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
  CreditCard,
  Paintbrush,
  Webhook,
} as const

type NavItem = {
  title: string
  href: string
  icon: string
}

type ProjectScopedSidebarProps = {
  session?: any
  organizationId: string
  organizationSlug: string
  organizationName: string
  projectId: string
  projectSlug: string
  projectName: string
  projects: Array<{ id: string; name: string; slug: string }>
  permissions: Permission[]
  children?: ReactNode
}

export function ProjectScopedSidebar({
  session,
  organizationId,
  organizationSlug,
  organizationName,
  projectId,
  projectSlug,
  projectName,
  projects,
  permissions,
}: ProjectScopedSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isMobile, setOpenMobile } = useSidebar()
  const permissionSet = new Set(permissions)

  const basePath = `/${organizationSlug}/${projectSlug}`
  const dashboardPath = basePath

  const navItems: NavItem[] = [
    { title: 'Dashboard', href: dashboardPath, icon: 'LayoutDashboard' },
    { title: 'Analytics', href: `${basePath}/analytics`, icon: 'BarChart3' },
    { title: 'Meta Ads', href: `${basePath}/meta-ads`, icon: 'Meta' },
    { title: 'Mensagens', href: `${basePath}/whatsapp/inbox`, icon: 'MessageSquare' },
    { title: 'Campanhas', href: `${basePath}/whatsapp/campaigns`, icon: 'Megaphone' },
    { title: 'Projetos', href: `${basePath}/projects`, icon: 'FolderKanban' },
    { title: 'Leads', href: `${basePath}/leads`, icon: 'Users' },
    { title: 'Tickets', href: `${basePath}/tickets`, icon: 'Kanban' },
    { title: 'Vendas', href: `${basePath}/sales`, icon: 'ShoppingBag' },
    { title: 'IA', href: `${basePath}/ia`, icon: 'Sparkles' },
  ]

  const navPermissionByHref: Partial<Record<string, Permission>> = {
    [dashboardPath]: 'view:dashboard',
    [`${basePath}/analytics`]: 'view:analytics',
    [`${basePath}/whatsapp/inbox`]: 'view:whatsapp',
    [`${basePath}/whatsapp/campaigns`]: 'view:whatsapp',
    [`${basePath}/meta-ads`]: 'view:meta',
    [`${basePath}/projects`]: 'view:leads',
    [`${basePath}/leads`]: 'view:leads',
    [`${basePath}/tickets`]: 'view:tickets',
    [`${basePath}/sales`]: 'view:sales',
    [`${basePath}/ia`]: 'view:ai',
  }

  const userName = session?.user?.name || 'Usuário'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const requiredPermission = navPermissionByHref[item.href]
      if (requiredPermission && !permissionSet.has(requiredPermission)) {
        return null
      }

      const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

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
              <Link href={dashboardPath}>
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
                  <span className="truncate font-semibold">{organizationName}</span>
                  <span className="text-muted-foreground truncate text-xs">{projectName}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 pb-2 pt-3 group-data-[collapsible=icon]:hidden">
          <p className="text-muted-foreground mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide">
            Projeto atual
          </p>
          <ProjectSelector
            organizationId={organizationId}
            value={projectId}
            onChange={(newProjectId) => {
              if (newProjectId) {
                const targetProject = projects.find((project) => project.id === newProjectId)
                if (!targetProject) return

                const currentSuffix = pathname.startsWith(basePath)
                  ? pathname.slice(basePath.length)
                  : ''
                const nextSuffix = currentSuffix || ''
                const nextSearch = searchParams.toString()

                router.push(
                  `/${organizationSlug}/${targetProject.slug}${nextSuffix}${nextSearch ? `?${nextSearch}` : ''}`,
                )
              }
            }}
            placeholder="Selecionar projeto"
            className="h-9 rounded-lg text-xs"
            projects={projects}
          />
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Visão Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) =>
                  [
                    dashboardPath,
                    `${basePath}/analytics`,
                  ].includes(item.href)
                )
                .map((item) => {
                  const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                  const isActive = pathname === item.href
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
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Captação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) =>
                  [
                    `${basePath}/meta-ads`,
                    `${basePath}/whatsapp/inbox`,
                    `${basePath}/whatsapp/campaigns`,
                  ].includes(item.href)
                )
                .map((item) => {
                  const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) =>
                  [
                    `${basePath}/projects`,
                    `${basePath}/leads`,
                    `${basePath}/tickets`,
                    `${basePath}/sales`,
                  ].includes(
                    item.href
                  )
                )
                .map((item) => {
                  const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => item.href === `${basePath}/ia`)
                .map((item) => {
                  const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
                })}
            </SidebarMenu>
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
                    pathname === `${basePath}/settings` ||
                    pathname.startsWith(`${basePath}/settings/profile`)
                  }
                  tooltip="Perfil"
                >
                  <Link href={`${basePath}/settings/profile`} onClick={handleNavClick}>
                    <UserCircle className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {permissionSet.has('manage:organization') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/organization`)}
                    tooltip="Organização"
                  >
                    <Link href={`${basePath}/settings/organization`} onClick={handleNavClick}>
                      <Building2 className="h-4 w-4" />
                      <span>Organização</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {permissionSet.has('manage:members') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/team`)}
                    tooltip="Equipe"
                  >
                    <Link href={`${basePath}/settings/team`} onClick={handleNavClick}>
                      <Users className="h-4 w-4" />
                      <span>Equipe</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {permissionSet.has('manage:integrations') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname.startsWith(`${basePath}/settings/integrations`) ||
                      pathname.startsWith(`${basePath}/settings/whatsapp`) ||
                      pathname.startsWith(`${basePath}/settings/meta-ads`)
                    }
                    tooltip="Integrações"
                  >
                    <Link href={`${basePath}/settings/integrations`} onClick={handleNavClick}>
                      <Plug className="h-4 w-4" />
                      <span>Integrações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {permissionSet.has('manage:settings') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/pipeline`)}
                    tooltip="Pipeline"
                  >
                    <Link href={`${basePath}/settings/pipeline`} onClick={handleNavClick}>
                      <GitBranch className="h-4 w-4" />
                      <span>Pipeline</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {permissionSet.has('manage:ai') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/ai-studio`)}
                    tooltip="IA Studio"
                  >
                    <Link href={`${basePath}/settings/ai-studio`} onClick={handleNavClick}>
                      <Bot className="h-4 w-4" />
                      <span>IA Studio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {permissionSet.has('manage:items') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/catalog`)}
                    tooltip="Catálogo"
                  >
                    <Link href={`${basePath}/settings/catalog`} onClick={handleNavClick}>
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
                    pathname.startsWith(`${basePath}/settings/subscription`) ||
                    pathname.startsWith(`${basePath}/settings/billing`)
                  }
                  tooltip="Assinatura"
                >
                  <Link href={`${basePath}/settings/subscription`} onClick={handleNavClick}>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Assinatura</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {permissionSet.has('view:audit') ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/audit`)}
                    tooltip="Auditoria"
                  >
                    <Link href={`${basePath}/settings/audit`} onClick={handleNavClick}>
                      <ScrollText className="h-4 w-4" />
                      <span>Auditoria</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {session?.user?.role === 'admin' || session?.user?.role === 'owner' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/webhooks`)}
                    tooltip="Webhooks"
                  >
                    <Link href={`${basePath}/settings/webhooks/whatsapp`} onClick={handleNavClick}>
                      <Webhook className="h-4 w-4" />
                      <span>Webhooks</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/settings/billing`)}
                    tooltip="Planos e Cobrança"
                  >
                    <Link href={`${basePath}/settings/billing`} onClick={handleNavClick}>
                      <CreditCard className="h-4 w-4" />
                      <span>Planos e Cobrança</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {session?.user?.role === 'owner' ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(`${basePath}/design-system`)}
                      tooltip="Design System"
                    >
                      <Link href={`${basePath}/design-system`} onClick={handleNavClick}>
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
