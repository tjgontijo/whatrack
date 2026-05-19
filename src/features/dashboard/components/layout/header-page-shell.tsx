'use client'

import { Loader2, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import type React from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
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
  bodyClassName?: string
  contentClassName?: string
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
  bodyClassName,
  contentClassName,
  children,
}: HeaderPageShellProps) {
  const hasSearch = typeof searchValue === 'string' && typeof onSearchChange === 'function'
  const builtInRefreshAction =
    typeof onRefresh === 'function' ? (
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        className='h-7 w-7'
        onClick={onRefresh}
        disabled={isRefreshing}
        title='Atualizar'
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
      </Button>
    ) : null

  const resolvedRefreshAction = refreshAction ?? builtInRefreshAction
  const hasTrailingControls = Boolean(actions || primaryAction || filters || resolvedRefreshAction)
  const showSeparator = hasSearch && hasTrailingControls

  return (
    <section className='flex h-full flex-col overflow-hidden'>
      <div className='flex h-12 shrink-0 items-center gap-2 border-border border-b px-4'>
        <h1 className='shrink-0 font-semibold text-sm'>{title}</h1>

        {selector ? <div className='ml-1 shrink-0'>{selector}</div> : null}

        <div className='flex-1' />

        {hasSearch ? (
          <div className='relative flex items-center'>
            <Search className='pointer-events-none absolute left-0 h-3.5 w-3.5 text-muted-foreground/35' />
            <input
              className='w-44 bg-transparent pl-5 text-xs placeholder:text-muted-foreground/35 focus:outline-none'
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        ) : null}

        {showSeparator ? (
          <div data-testid='header-page-shell-separator' className='h-4 w-px shrink-0 bg-border' />
        ) : null}

        {actions}

        {primaryAction}

        {filters ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='h-7 w-7'
                title='Filtros'
              >
                <SlidersHorizontal className='h-3.5 w-3.5' />
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='flex w-72 flex-col gap-0 p-0'>
              <SheetHeader className='border-border border-b px-4 py-3'>
                <SheetTitle className='font-medium text-sm'>Filtros</SheetTitle>
              </SheetHeader>
              <div className='flex-1 space-y-5 overflow-y-auto px-4 py-4'>{filters}</div>
            </SheetContent>
          </Sheet>
        ) : null}

        {resolvedRefreshAction}
      </div>

      <div className={cn('scrollbar-hide flex-1 overflow-y-auto', bodyClassName)}>
        <div
          data-testid='header-page-shell-body'
          className={cn('flex flex-col', !contentClassName && 'min-h-full px-6 py-6', contentClassName)}
        >
          {isLoading ? (
            <div className='flex min-h-[calc(100svh-14rem)] items-center justify-center'>
              <div className='flex flex-col items-center gap-3'>
                <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary/10 border-t-primary' />
                <p className='font-bold text-muted-foreground text-xs uppercase tracking-widest'>
                  Carregando...
                </p>
              </div>
            </div>
          ) : (
            <>
              {children}
              {isFetchingMore ? (
                <div className='flex items-center justify-center gap-2 py-6 text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span className='font-medium text-xs'>Carregando mais...</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
