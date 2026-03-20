import { SidebarClient } from './sidebar-client'
import type { Permission } from '@/lib/auth/rbac/roles'

type NavItem = {
  title: string
  href: string
  icon: string
}

type DashboardSidebarProps = {
  session?: any
  organizationId: string
  organizationName: string
  projects: Array<{ id: string; name: string }>
  activeProjectId: string | null
  permissions: Permission[]
}

export function DashboardSidebar({
  session,
  organizationId,
  organizationName,
  projects,
  activeProjectId,
  permissions,
}: DashboardSidebarProps) {
  const navItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { title: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
    { title: 'Meta Ads', href: '/dashboard/meta-ads', icon: 'Meta' },
    { title: 'Mensagens', href: '/dashboard/whatsapp/inbox', icon: 'MessageSquare' },
    { title: 'Campanhas', href: '/dashboard/whatsapp/campaigns', icon: 'Megaphone' },
    { title: 'Projetos', href: '/dashboard/projects', icon: 'FolderKanban' },
    { title: 'Leads', href: '/dashboard/leads', icon: 'Users' },
    { title: 'Tickets', href: '/dashboard/tickets', icon: 'Kanban' },
    { title: 'Vendas', href: '/dashboard/sales', icon: 'ShoppingBag' },
    { title: 'IA Copilot', href: '/dashboard/ia', icon: 'Sparkles' },
  ]

  return (
    <SidebarClient
      navItems={navItems}
      navigationLabel="Navegação"
      session={session}
      organizationId={organizationId}
      organizationName={organizationName}
      projects={projects}
      activeProjectId={activeProjectId}
      permissions={permissions}
    />
  )
}
