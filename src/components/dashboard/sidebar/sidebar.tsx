import { SidebarClient } from './sidebar-client'

type NavItem = {
    title: string
    href: string
    icon: string
}

export function DashboardSidebar() {
    const navItems: NavItem[] = [
        { title: 'Visão Geral', href: '/dashboard', icon: 'LayoutDashboard' },
        { title: 'Chat', href: '/dashboard/chat', icon: 'MessageSquare' },
        { title: 'Leads', href: '/dashboard/leads', icon: 'Users' },
        { title: 'Tickets', href: '/dashboard/tickets', icon: 'Inbox' },
        { title: 'Vendas', href: '/dashboard/sales', icon: 'ShoppingBag' },
        { title: 'Produtos', href: '/dashboard/products', icon: 'Package' },
        { title: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
    ]

    return (
        <SidebarClient
            navItems={navItems}
            navigationLabel="Navegação"
        />
    )
}
