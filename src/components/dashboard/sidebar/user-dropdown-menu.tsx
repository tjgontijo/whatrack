'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, LogOut, User, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

interface UserDropdownMenuProps {
  userName: string
  userEmail: string
  userImage?: string | null
}

export function UserDropdownMenu({ userName, userEmail, userImage }: UserDropdownMenuProps) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [avatarError, setAvatarError] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const initials = React.useMemo(() => {
    const name = (userName ?? '').trim()
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean)
      if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? 'U'
      return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
    }
    const email = (userEmail ?? '').trim()
    if (email) return email[0]?.toUpperCase() ?? 'U'
    return 'U'
  }, [userName, userEmail])

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

  const userSummary = (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        {userImage && !avatarError && (
          <AvatarImage src={userImage} alt={userName} onError={() => setAvatarError(true)} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary rounded-lg">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-semibold">{userName || 'Usuário'}</span>
        <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
      </div>
      <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
    </>
  )

  if (!mounted) {
    return (
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        {userSummary}
      </SidebarMenuButton>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          {userSummary}
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
              {userImage && !avatarError && <AvatarImage src={userImage} alt={userName} />}
              <AvatarFallback className="bg-primary/10 text-primary rounded-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{userName || 'Usuário'}</span>
              <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => handleNavigate('/dashboard/account')}>
            <User className="mr-2 h-4 w-4" />
            Minha Conta
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="mr-2 h-4 w-4 dark:hidden" />
              <Moon className="mr-2 hidden h-4 w-4 dark:block" />
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

        <DropdownMenuItem
          onSelect={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
