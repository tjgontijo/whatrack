import { SidebarClient } from './sidebar-client'

type NavItem = {
    title: string
    href: string
    icon: string
}

export function DashboardSidebar() {
    const navItems: NavItem[] = [
        { title: 'Visão Geral', href: '/dashboard', icon: 'LayoutDashboard' },
        { title: 'Leads', href: '/dashboard/leads', icon: 'Users' },
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
