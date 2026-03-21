'use client'

import React from 'react'
import { Plus, Search, SlidersHorizontal, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ViewSwitcher } from './view-switcher'
import { ViewType } from './types'

interface CrudPageShellProps {
  title: string

  // View switching
  view: ViewType
  setView: (view: ViewType) => void
  enabledViews?: ViewType[]

  // Search
  searchInput: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Actions
  onAdd?: () => void
  addLabel?: string
  onRefresh?: () => void
  isRefreshing?: boolean

  // Extra right-side content (counters, badges, etc.)
  actions?: React.ReactNode

  // Filters (shown in sheet)
  filters?: React.ReactNode

  // Data / loading
  isFetchingMore?: boolean
  isLoading?: boolean

  children: React.ReactNode
}

export function CrudPageShell({
  title,
  view,
  setView,
  enabledViews,
  searchInput,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  onAdd,
  addLabel = 'Novo',
  onRefresh,
  isRefreshing = false,
  actions,
  filters,
  isFetchingMore = false,
  isLoading,
  children,
}: CrudPageShellProps) {
  const isMobile = useIsMobile()

  // Auto-switch to cards on mobile
  React.useEffect(() => {
    if (isMobile && (view === 'list' || view === 'kanban')) {
      setView('cards')
    }
  }, [isMobile, view, setView])

  return (
    <section className="flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <div className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold shrink-0">{title}</h1>

        <ViewSwitcher
          view={view}
          setView={setView}
          enabledViews={enabledViews}
          className="ml-1"
        />

        <div className="flex-1" />

        {/* Ghost search */}
        <div className="relative flex items-center">
          <Search className="text-muted-foreground/35 pointer-events-none absolute left-0 h-3.5 w-3.5" />
          <input
            className="w-44 bg-transparent pl-5 text-xs placeholder:text-muted-foreground/35 focus:outline-none"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Separator */}
        <div className="bg-border h-4 w-px shrink-0" />

        {/* Extra actions (counters, etc.) */}
        {actions}

        {/* Insert button */}
        {onAdd && (
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </Button>
        )}

        {/* Filter sheet */}
        {filters && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-7 w-7">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col gap-0 p-0">
              <SheetHeader className="border-border border-b px-4 py-3">
                <SheetTitle className="text-sm font-medium">Filtros</SheetTitle>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">{filters}</div>
            </SheetContent>
          </Sheet>
        )}

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Content area */}
      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="border-primary/10 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                Carregando...
              </p>
            </div>
          </div>
        ) : (
          <>
            {children}
            {isFetchingMore && (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-medium">Carregando mais...</span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
