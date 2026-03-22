'use client'

import type React from 'react'
import { Loader2, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils/utils'

export type HeaderPageShellProps = {
  title: string
  selector?: React.ReactNode
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  actions?: React.ReactNode
  primaryAction?: React.ReactNode
  filters?: React.ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
  refreshAction?: React.ReactNode
  isLoading?: boolean
  isFetchingMore?: boolean
  children: React.ReactNode
}

export function HeaderPageShell({
  title,
  selector,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  actions,
  primaryAction,
  filters,
  onRefresh,
  isRefreshing = false,
  refreshAction,
  isLoading = false,
  isFetchingMore = false,
  children,
}: HeaderPageShellProps) {
  const hasSearch = typeof searchValue === 'string' && typeof onSearchChange === 'function'
  const builtInRefreshAction =
    typeof onRefresh === 'function' ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-7 w-7"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Atualizar"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
      </Button>
    ) : null

  const resolvedRefreshAction = refreshAction ?? builtInRefreshAction
  const hasTrailingControls = Boolean(
    actions || primaryAction || filters || resolvedRefreshAction,
  )
  const showSeparator = hasSearch && hasTrailingControls

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="shrink-0 text-sm font-semibold">{title}</h1>

        {selector ? <div className="ml-1 shrink-0">{selector}</div> : null}

        <div className="flex-1" />

        {hasSearch ? (
          <div className="relative flex items-center">
            <Search className="text-muted-foreground/35 pointer-events-none absolute left-0 h-3.5 w-3.5" />
            <input
              className="w-44 bg-transparent pl-5 text-xs placeholder:text-muted-foreground/35 focus:outline-none"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        ) : null}

        {showSeparator ? (
          <div data-testid="header-page-shell-separator" className="bg-border h-4 w-px shrink-0" />
        ) : null}

        {actions}

        {primaryAction}

        {filters ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7"
                title="Filtros"
              >
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
        ) : null}

        {resolvedRefreshAction}
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto">
        <div data-testid="header-page-shell-body" className="min-h-full px-6 py-6">
          {isLoading ? (
            <div className="flex min-h-[calc(100svh-14rem)] items-center justify-center">
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
              {isFetchingMore ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-medium">Carregando mais...</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
