import { SidebarClient } from './sidebar-client'

type NavItem = {
    title: string
    href: string
    icon: string
}

export function DashboardSidebar() {
    const navItems: NavItem[] = [
        { title: 'Visão Geral', href: '/dashboard', icon: 'LayoutDashboard' },
        { title: 'Mensagens', href: '/dashboard/whatsapp/inbox', icon: 'MessageSquare' },
        { title: 'Leads', href: '/dashboard/leads', icon: 'Users' },
        { title: 'IA Copilot', href: '/dashboard/approvals', icon: 'Sparkles' },
        { title: 'Tickets', href: '/dashboard/tickets', icon: 'Kanban' },
        { title: 'Vendas', href: '/dashboard/sales', icon: 'ShoppingBag' },
        { title: 'Produtos', href: '/dashboard/products', icon: 'Package' },
    ]

    return (
        <SidebarClient
            navItems={navItems}
            navigationLabel="Navegação"
        />
    )
}
