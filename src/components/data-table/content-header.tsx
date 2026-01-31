'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface ContentHeaderProps {
  children?: React.ReactNode
  className?: string
}

/**
 * ContentHeader - Header unificado com search, tabs, view toggle e filtros
 *
 * Layout proposto:
 * Desktop (≥768px):
 *   [🔍 Pesquisar...] [Tabs] [📋 Tabela][🎴 Cards] [⚙️ Filtros] [+ Add]
 *
 * Mobile (<768px):
 *   [🔍 Pesquisar...                              ]
 *   [Tabs...]
 *   [⚙️ Filtros (2)]                    [+ Add]
 *
 * Características:
 * - Responsivo (adapta layout para mobile/desktop)
 * - Suporta search, tabs, view toggle, filtros e actions
 * - Progressive disclosure (quick search visível)
 * - Reutilizável em múltiplas páginas
 *
 * Estrutura esperada:
 * ```tsx
 * <ContentHeader>
 *   <FilterInput ... />
 *   <ContentHeaderTabs ... />
 *   <SegmentedControl ... />
 *   <DataTableFiltersButton ... />
 *   <ContentHeaderActions>
 *     <Button>+ Add</Button>
 *   </ContentHeaderActions>
 * </ContentHeader>
 * ```
 */
export const ContentHeader = React.forwardRef<
  HTMLDivElement,
  ContentHeaderProps
>(({ children, className }, ref) => {
  const isMobile = useIsMobile()

  return (
    <div
      ref={ref}
      className={cn(
        'border-b',
        isMobile ? 'flex flex-col gap-3' : 'flex items-center gap-3',
        'px-4 py-3',
        'bg-background',
        className
      )}
    >
      {isMobile ? (
        // Mobile layout: multi-line
        <>
          {/* Linha 1: Search input */}
          <div className="w-full">
            {React.Children.toArray(children)
              .filter((child) => {
                const component = (child as any)?.type?.displayName
                return component === 'FilterInput'
              })}
          </div>

          {/* Linha 2: Tabs (se existir) */}
          {React.Children.toArray(children).some(
            (child) => (child as any)?.type?.displayName === 'ContentHeaderTabs'
          ) && (
            <div className="w-full overflow-x-auto">
              {React.Children.toArray(children).filter(
                (child) => (child as any)?.type?.displayName === 'ContentHeaderTabs'
              )}
            </div>
          )}

          {/* Linha 3: Filters button + Actions */}
          <div className="flex items-center justify-between gap-2">
            <div>
              {React.Children.toArray(children).filter(
                (child) => (child as any)?.type?.displayName === 'DataTableFiltersButton'
              )}
            </div>
            <div className="flex gap-2">
              {React.Children.toArray(children).filter(
                (child) => (child as any)?.type?.displayName === 'ContentHeaderActions'
              )}
            </div>
          </div>
        </>
      ) : (
        // Desktop layout: uma linha
        <>
          {/* Seção 1: Search - limited width */}
          <div className="w-full max-w-sm">
            {React.Children.toArray(children).filter(
              (child) => (child as any)?.type?.displayName === 'FilterInput'
            )}
          </div>

          {/* Seção 2: Tabs (se existir) */}
          {React.Children.toArray(children).some(
            (child) => (child as any)?.type?.displayName === 'ContentHeaderTabs'
          ) && (
            <div className="flex-shrink-0">
              {React.Children.toArray(children).filter(
                (child) => (child as any)?.type?.displayName === 'ContentHeaderTabs'
              )}
            </div>
          )}

          {/* Seção 3: View toggle */}
          <div className="flex-shrink-0">
            {React.Children.toArray(children).filter(
              (child) => (child as any)?.type?.displayName === 'SegmentedControl'
            )}
          </div>

          {/* Seção 4: Filters button */}
          <div className="flex-shrink-0">
            {React.Children.toArray(children).filter(
              (child) => (child as any)?.type?.displayName === 'DataTableFiltersButton'
            )}
          </div>

          {/* Seção 5: Actions (Add button, etc) */}
          {React.Children.toArray(children).some(
            (child) => (child as any)?.type?.displayName === 'ContentHeaderActions'
          ) && (
            <div className="ml-auto flex-shrink-0">
              {React.Children.toArray(children).filter(
                (child) => (child as any)?.type?.displayName === 'ContentHeaderActions'
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
})

ContentHeader.displayName = 'ContentHeader'

/**
 * ContentHeaderTabs - Container para tabs/abas no content header
 */
interface ContentHeaderTabsProps {
  children?: React.ReactNode
  className?: string
}

export const ContentHeaderTabs = React.forwardRef<HTMLDivElement, ContentHeaderTabsProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-1', className)}
      >
        {children}
      </div>
    )
  }
)

ContentHeaderTabs.displayName = 'ContentHeaderTabs'

/**
 * ContentHeaderActions - Container para ações (botões, etc) no content header
 */
interface ContentHeaderActionsProps {
  children?: React.ReactNode
  className?: string
}

export const ContentHeaderActions = React.forwardRef<HTMLDivElement, ContentHeaderActionsProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2', className)}
      >
        {children}
      </div>
    )
  }
)

ContentHeaderActions.displayName = 'ContentHeaderActions'
