'use client'

import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { HeaderActionsSlot } from './header-actions'

// Route labels mapping (excluding /dashboard prefix)
const ROUTE_LABELS: Record<string, string> = {
    '': 'Visão Geral',
    'leads': 'Leads',
    'tickets': 'Tickets',
    'sales': 'Vendas',
    'products': 'Produtos',
    'settings': 'Configurações',
    'settings/whatsapp': 'WhatsApp',
    'settings/billing': 'Billing',
    'settings/profile': 'Perfil',
    'settings/organization': 'Organização',
    'settings/team': 'Equipe',
    'meta-ads': 'Meta Ads',
    'chat': 'Chat',
}

function getRouteLabel(segment: string, fullPath: string, queryClient: any): string {
    // 1. Check if we have a dynamic WhatsApp phone number in cache
    if (fullPath.startsWith('settings/whatsapp/')) {
        const phoneId = segment;
        // Try to find the phone in the "listPhoneNumbers" query cache
        const phoneNumbers = queryClient.getQueryData(['whatsapp', 'phone-numbers']) as any[];
        if (phoneNumbers) {
            const phone = phoneNumbers.find((p: any) => p.id === phoneId);
            if (phone) return phone.display_phone_number;
        }
    }

    // 2. Try full path from mapping
    if (ROUTE_LABELS[fullPath]) {
        return ROUTE_LABELS[fullPath]
    }
    // 3. Fall back to segment
    if (ROUTE_LABELS[segment]) {
        return ROUTE_LABELS[segment]
    }
    // 4. Case-by-case friendly names
    if (segment === 'whatsapp') return 'WhatsApp'

    // Capitalize first letter as fallback
    return segment.charAt(0).toUpperCase() + segment.slice(1)
}

type BreadcrumbItemData = {
    label: string
    href: string
    isCurrentPage: boolean
}

function generateBreadcrumbs(pathname: string, queryClient: any): BreadcrumbItemData[] {
    const withoutDashboard = pathname.replace(/^\/dashboard\/?/, '')

    if (!withoutDashboard) {
        return [{ label: 'Visão Geral', href: '/dashboard', isCurrentPage: true }]
    }

    const segments = withoutDashboard.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItemData[] = []

    let currentPath = ''

    segments.forEach((segment, index) => {
        currentPath += (currentPath ? '/' : '') + segment
        const isLast = index === segments.length - 1

        breadcrumbs.push({
            label: getRouteLabel(segment, currentPath, queryClient),
            href: `/dashboard/${currentPath}`,
            isCurrentPage: isLast,
        })
    })

    return breadcrumbs
}

export function DashboardHeader() {
    const pathname = usePathname()
    const queryClient = useQueryClient()
    const breadcrumbs = generateBreadcrumbs(pathname, queryClient)

    return (
        <header className="flex h-[65px] shrink-0 items-center gap-2 border-b px-4 bg-background">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <Breadcrumb>
                <BreadcrumbList>
                    {breadcrumbs.map((item, index) => {
                        // Check if this is the "settings" segment which shouldn't be clickable
                        const isSettingsLink = item.href.endsWith('/settings')

                        return (
                            <Fragment key={item.href}>
                                {index > 0 && <BreadcrumbSeparator />}
                                <BreadcrumbItem>
                                    {item.isCurrentPage || isSettingsLink ? (
                                        <BreadcrumbPage className={`font-semibold text-foreground ${isSettingsLink ? 'opacity-60 cursor-default' : ''}`}>
                                            {item.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={item.href}>{item.label}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-2">
                <HeaderActionsSlot />
            </div>
        </header>
    )
}
