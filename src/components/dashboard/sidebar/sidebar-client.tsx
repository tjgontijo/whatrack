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
    Inbox,
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
import { WhatsAppIcon, MetaIcon } from '@/components/icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient, useSession } from '@/lib/auth/auth-client'
import { UserDropdownMenu } from './user-dropdown-menu'

// Icon mapping for dynamic nav items
const ICON_MAP = {
    LayoutDashboard,
    Users,
    MessageSquare,
    Inbox,
    ShoppingBag,
    Package,
    BarChart3,
    Meta: MetaIcon,
    WhatsApp: WhatsAppIcon,
    Settings,
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
}

export function SidebarClient({ navItems }: SidebarClientProps) {
    const pathname = usePathname()
    const { isMobile, setOpenMobile } = useSidebar()
    const { data: session } = useSession()
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
    const platformItems = navItems.filter(item =>
        ['LayoutDashboard'].includes(item.icon)
    )

    const dataItems = navItems.filter(item =>
        ['Users', 'MessageSquare', 'ShoppingBag', 'Package'].includes(item.icon)
    )

    const configItems = [
        { title: 'WhatsApp', href: '/dashboard/settings/whatsapp', icon: 'WhatsApp' },
        { title: 'Meta Ads', href: '/dashboard/settings/meta-ads', icon: 'Meta' },
        { title: 'Billing', href: '/dashboard/settings/billing', icon: 'CreditCard' },
    ]

    return (
        <Sidebar collapsible="icon">
            {/* Header with Logo */}
            <SidebarHeader className="border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            asChild
                        >
                            <Link href="/dashboard">
                                {/* Square logo (32x32) when collapsed */}
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Image
                                        src="/images/transparent_icon_white.png"
                                        alt="Whatrack"
                                        width={20}
                                        height={20}
                                        className="size-5"
                                    />
                                </div>
                                {/* Text only appears when expanded */}
                                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate font-semibold">Whatrack</span>
                                    <span className="truncate text-xs text-muted-foreground">
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

                {/* Data section - Leads, Sales, etc */}
                <SidebarGroup>
                    <SidebarGroupLabel>Dados</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {dataItems.map((item) => {
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

                {/* Config section */}
                <SidebarGroup>
                    <SidebarGroupLabel>Configurações</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {configItems.map((item) => {
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
            </SidebarContent>

            {/* Footer with User Menu */}
            <SidebarFooter className="border-t">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserDropdownMenu
                            userName={userName}
                            userEmail={userEmail}
                            userImage={userImage}
                        />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            {/* Resize rail - VS Code style */}
            <SidebarRail />
        </Sidebar>
    )
}
