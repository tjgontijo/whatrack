import { SidebarClient } from './sidebar-client'

type NavItem = {
  title: string
  href: string
  icon: string
}

export function DashboardSidebar({ session }: { session?: any }) {
  const navItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { title: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
    { title: 'Meta Ads', href: '/dashboard/meta-ads', icon: 'Meta' },
    { title: 'Mensagens', href: '/dashboard/whatsapp/inbox', icon: 'MessageSquare' },
    { title: 'Projetos', href: '/dashboard/projects', icon: 'FolderKanban' },
    { title: 'Leads', href: '/dashboard/leads', icon: 'Users' },
    { title: 'Tickets', href: '/dashboard/tickets', icon: 'Kanban' },
    { title: 'Vendas', href: '/dashboard/sales', icon: 'ShoppingBag' },
    { title: 'IA Copilot', href: '/dashboard/ia', icon: 'Sparkles' },
  ]

  return <SidebarClient navItems={navItems} navigationLabel="Navegação" session={session} />
}
