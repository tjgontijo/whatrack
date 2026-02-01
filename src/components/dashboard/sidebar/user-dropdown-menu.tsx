'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
    ChevronsUpDown,
    Sparkles,
    Settings,
    CreditCard,
    Bell,
    LogOut,
    Building2,
    User,
    Users,
    Sun,
    Moon,
    Monitor,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth/auth-client'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface UserDropdownMenuProps {
    userName: string
    userEmail: string
    userImage?: string | null
}

export function UserDropdownMenu({
    userName,
    userEmail,
    userImage,
}: UserDropdownMenuProps) {
    const router = useRouter()
    const { setTheme } = useTheme()
    const [avatarLoaded, setAvatarLoaded] = React.useState(false)
    const [avatarError, setAvatarError] = React.useState(false)

    const initials = React.useMemo(() => {
        const name = (userName ?? '').trim()
        if (name) {
            const parts = name.split(/\s+/).filter(Boolean)
            if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? 'U'
            return (
                (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
            ).toUpperCase()
        }
        const email = (userEmail ?? '').trim()
        if (email) return email[0]?.toUpperCase() ?? 'U'
        return 'U'
    }, [userName, userEmail])

    const showSkeleton = userImage && !avatarLoaded && !avatarError

    const handleNavigate = (path: string) => {
        router.push(path)
    }

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        router.push('/sign-in')
                    },
                },
            })
        } catch (error) {
            console.error('[UserDropdownMenu] Erro ao sair:', error)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                    {showSkeleton ? (
                        <>
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <Skeleton className="h-4 w-24 mb-1" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </>
                    ) : (
                        <>
                            <Avatar className="h-8 w-8 rounded-lg">
                                {userImage && !avatarError && (
                                    <AvatarImage
                                        src={userImage}
                                        alt={userName}
                                        onLoad={() => setAvatarLoaded(true)}
                                        onError={() => setAvatarError(true)}
                                    />
                                )}
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-semibold">
                                    {userName || 'Usuário'}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {userEmail}
                                </span>
                            </div>
                        </>
                    )}
                    <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
            >
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                            {userImage && !avatarError && (
                                <AvatarImage src={userImage} alt={userName} />
                            )}
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                                {userName || 'Usuário'}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {userEmail}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />



                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => handleNavigate('/dashboard/settings/organization')}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Empresa
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleNavigate('/dashboard/settings/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleNavigate('/dashboard/settings/team')}>
                        <Users className="mr-2 h-4 w-4" />
                        Equipe
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Sun className="mr-2 h-4 w-4 dark:hidden" />
                            <Moon className="mr-2 h-4 w-4 hidden dark:block" />
                            <span>Tema</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => setTheme('light')}>
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>Claro</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('dark')}>
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>Escuro</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('system')}>
                                    <Monitor className="mr-2 h-4 w-4" />
                                    <span>Sistema</span>
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
