'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  Building2,
  CreditCard,
  Kanban,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShoppingBag,
  UserCircle,
  Users,
} from 'lucide-react'

import type { Permission } from '@/lib/auth/rbac/roles'
import { MetaIcon, WhatsAppIcon } from '@/components/shared/icons'
import { cn } from '@/lib/utils/utils'

const ICON_MAP = {
  LayoutDashboard,
  Users,
  MessageSquare,
  Megaphone,
  ShoppingBag,
  Meta: MetaIcon,
  WhatsApp: WhatsAppIcon,
  Kanban,
  UserCircle,
  Building2,
  Bot,
  Package,
  ScrollText,
  CreditCard,
  Paintbrush,
} as const

type NavItem = {
  title: string
  href: string
  icon: keyof typeof ICON_MAP
  permission?: Permission
  activePatterns?: string[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

export type AppSidebarProps = {
  session?: {
    user?: { role?: string | null }
  }
  organizationId: string
  organizationSlug: string
  organizationName: string
  projectId: string
  projectSlug: string
  projectName: string
  projects: Array<{ id: string; name: string; slug: string }>
  permissions: Permission[]
  collapsed: boolean
  onToggle: () => void
}

function isActive(pathname: string, item: NavItem, basePath: string) {
  const patterns = item.activePatterns ?? [item.href]
  return patterns.some((p) => {
    if (p === basePath) return pathname === p
    return pathname === p || pathname.startsWith(`${p}/`)
  })
}

export function AppSidebar({
  session,
  organizationSlug,
  projectSlug,
  permissions,
  collapsed,
  onToggle,
}: AppSidebarProps) {
  const pathname = usePathname()
  const permissionSet = new Set(permissions)

  const basePath = `/${organizationSlug}/${projectSlug}`
  const isSettingsMode =
    pathname === `${basePath}/settings` || pathname.startsWith(`${basePath}/settings/`)
  const isAdminUser = session?.user?.role === 'admin' || session?.user?.role === 'owner'
  const isOwnerUser = session?.user?.role === 'owner'

  const appGroups: NavGroup[] = [
    {
      label: 'Visão Geral',
      items: [
        { title: 'Dashboard', href: basePath, icon: 'LayoutDashboard', permission: 'view:dashboard' },
        { title: 'Inbox', href: `${basePath}/whatsapp/inbox`, icon: 'MessageSquare', permission: 'view:whatsapp' },
      ],
    },
    {
      label: 'Captação',
      items: [
        { title: 'Meta Ads', href: `${basePath}/meta-ads`, icon: 'Meta', permission: 'view:meta' },
        {
          title: 'Audiências',
          href: `${basePath}/whatsapp/audiences`,
          icon: 'Users',
          permission: 'view:whatsapp',
        },
        {
          title: 'Campanhas',
          href: `${basePath}/whatsapp/campaigns`,
          icon: 'Megaphone',
          permission: 'view:whatsapp',
        },
      ],
    },
    {
      label: 'CRM',
      items: [
        { title: 'Leads', href: `${basePath}/leads`, icon: 'Users', permission: 'view:leads' },
        { title: 'Pipeline', href: `${basePath}/tickets`, icon: 'Kanban', permission: 'view:tickets' },
        { title: 'Vendas', href: `${basePath}/sales`, icon: 'ShoppingBag', permission: 'view:sales' },
      ],
    },
    {
      label: 'Operação',
      items: [
        {
          title: 'Catálogo',
          href: `${basePath}/catalog`,
          icon: 'Package',
          permission: 'manage:items',
        },
      ],
    },
  ]

  const settingsGroups: NavGroup[] = [
    {
      label: 'Conta',
      items: [
        {
          title: 'Perfil',
          href: `${basePath}/settings/profile`,
          icon: 'UserCircle',
        },
      ],
    },
    {
      label: 'Workspace',
      items: [
        {
          title: 'Organização',
          href: `${basePath}/settings/organization`,
          icon: 'Building2',
          permission: 'manage:organization',
        },
        {
          title: 'Equipe',
          href: `${basePath}/settings/team`,
          icon: 'Users',
          permission: 'manage:members',
        },
      ],
    },
    {
      label: 'Canais',
      items: [
        {
          title: 'WhatsApp',
          href: `${basePath}/settings/whatsapp`,
          icon: 'WhatsApp',
          permission: 'manage:integrations',
          activePatterns: [`${basePath}/settings/whatsapp`, `${basePath}/settings/webhooks`],
        },
        {
          title: 'Meta Ads',
          href: `${basePath}/settings/meta-ads`,
          icon: 'Meta',
          permission: 'manage:integrations',
        },
      ],
    },
    {
      label: 'Governança',
      items: [
        {
          title: 'Auditoria',
          href: `${basePath}/settings/audit`,
          icon: 'ScrollText',
          permission: 'view:audit',
        },
        ...(isOwnerUser
          ? [{ title: 'Assinatura', href: `${basePath}/settings/subscription`, icon: 'ShoppingBag' } satisfies NavItem]
          : []),
      ],
    },
    {
      label: 'Admin',
      items: [
        ...(isAdminUser
          ? [{ title: 'Planos e Cobrança', href: `${basePath}/settings/billing`, icon: 'CreditCard' } satisfies NavItem]
          : []),
        ...(isOwnerUser
          ? [{ title: 'Design System', href: `${basePath}/design-system`, icon: 'Paintbrush' } satisfies NavItem]
          : []),
      ],
    },
  ]

  const getVisibleItems = (items: NavItem[]) =>
    items.filter((item) => !item.permission || permissionSet.has(item.permission))

  const renderItem = (item: NavItem) => {
    if (item.permission && !permissionSet.has(item.permission)) return null
    const Icon = ICON_MAP[item.icon]
    const active = isActive(pathname, item, basePath)
    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.title}
        className={cn(
          'flex h-8 items-center gap-2.5 rounded-md text-sm transition-colors',
          'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          active && 'bg-sidebar-accent text-sidebar-foreground',
          collapsed ? 'justify-center px-0' : 'px-2'
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'bg-sidebar flex flex-col overflow-hidden transition-[width] duration-200 ease-linear shrink-0',
        collapsed ? 'w-12' : 'w-56'
      )}
    >
      {/* Nav */}
      <div className="scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden py-2">
        {isSettingsMode ? (
          <div className="flex flex-col gap-2 px-2">
            {settingsGroups.map((group) => {
              const visible = getVisibleItems(group.items)
              if (visible.length === 0) return null

              return (
                <div key={group.label}>
                  {!collapsed && (
                    <p className="mb-1 px-2 text-[11px] font-medium tracking-wide text-sidebar-foreground/40">
                      {group.label}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {visible.map(renderItem)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-0 px-2">
            {appGroups.map((group) => {
              const visible = getVisibleItems(group.items)
              if (visible.length === 0) return null
              return (
                <div key={group.label} className="mb-1">
                  {!collapsed && (
                    <p className="mb-0.5 px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      {group.label}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {visible.map(renderItem)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer: collapse toggle */}
      <div className="shrink-0 px-2 pb-3">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'flex h-8 w-full items-center gap-2.5 rounded-md text-sm transition-colors',
            'text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70',
            collapsed ? 'justify-center px-0' : 'px-2'
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
