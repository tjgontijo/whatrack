'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronsUpDown, LayoutDashboard, Plus, Settings } from 'lucide-react'

import { OrganizationStatusBadge } from '@/components/dashboard/organization/organization-status-badge'
import { UserDropdownMenu } from '@/components/dashboard/sidebar/user-dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils/utils'

const LAST_APP_PATH_STORAGE_KEY = 'dashboard:last-app-path'

type Project = { id: string; name: string; slug: string }

type DashboardTopbarProps = {
  session?: {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
  organizationName: string
  organizationLogo?: string | null
  organizationSlug: string
  projectName: string
  projectSlug: string
  projects?: Project[]
  hasOrganization?: boolean
  identityComplete?: boolean
}

export function DashboardTopbar({
  session,
  organizationName,
  organizationLogo,
  organizationSlug,
  projectName,
  projectSlug,
  projects = [],
  hasOrganization,
  identityComplete,
}: DashboardTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const basePath = `/${organizationSlug}/${projectSlug}`
  const isSettingsMode =
    pathname === `${basePath}/settings` || pathname.startsWith(`${basePath}/settings/`)
  const organizationInitial = organizationName.charAt(0).toUpperCase()
  const userName = session?.user?.name || 'Usuário'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image

  useEffect(() => {
    if (isSettingsMode) return
    const search = searchParams.toString()
    const currentPath = `${pathname}${search ? `?${search}` : ''}`
    window.sessionStorage.setItem(LAST_APP_PATH_STORAGE_KEY, currentPath)
  }, [isSettingsMode, pathname, searchParams])

  const handleAppModeNavigation = () => {
    const storedPath = window.sessionStorage.getItem(LAST_APP_PATH_STORAGE_KEY)
    const targetPath =
      storedPath &&
      storedPath.startsWith(basePath) &&
      !storedPath.startsWith(`${basePath}/settings`)
        ? storedPath
        : basePath
    router.push(targetPath)
  }

  const handleSelectProject = (slug: string) => {
    setOpen(false)
    if (slug !== projectSlug) {
      router.push(`/${organizationSlug}/${slug}`)
    }
  }

  return (
    <header className="bg-sidebar 3xl:px-6 flex h-14 w-full shrink-0 items-center gap-3 px-4 md:px-5">
      {/* Org logo (standalone link) */}
      <Link href={basePath} className="shrink-0">
        {organizationLogo ? (
          <Image
            src={organizationLogo}
            alt={organizationName}
            width={32}
            height={32}
            className="border-border size-8 rounded-lg border object-cover"
          />
        ) : (
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
            {organizationInitial}
          </div>
        )}
      </Link>

      {/* Project selector — single button: OrgName / ProjectName ▼ */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors',
              'hover:bg-sidebar-accent',
              open && 'bg-sidebar-accent',
            )}
          >
            <span className="text-muted-foreground/70 truncate font-medium">{organizationName}</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate font-medium">{projectName}</span>
            <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar projeto..." className="h-9" />
            <CommandList>
              <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => handleSelectProject(project.slug)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        project.slug === projectSlug ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{project.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-border border-t p-1">
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors"
                onClick={() => {
                  setOpen(false)
                  router.push(`/${organizationSlug}/${projectSlug}/projects`)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Novo projeto
              </button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {hasOrganization !== undefined && identityComplete !== undefined ? (
        <div className="hidden md:flex">
          <OrganizationStatusBadge
            hasOrganization={hasOrganization}
            identityComplete={identityComplete}
          />
        </div>
      ) : null}

      <div className="flex-1" />

      <nav className="flex items-center gap-1" aria-label="Modo de navegação">
        <Button
          type="button"
          variant={isSettingsMode ? 'ghost' : 'secondary'}
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleAppModeNavigation}
          aria-pressed={!isSettingsMode}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>

        <Button
          type="button"
          variant={isSettingsMode ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={() => router.push(`${basePath}/settings/profile`)}
          aria-label="Abrir configurações"
          aria-pressed={isSettingsMode}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </nav>

      <Separator orientation="vertical" className="hidden h-4 md:block" />

      <UserDropdownMenu
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        variant="topbar"
      />
    </header>
  )
}
