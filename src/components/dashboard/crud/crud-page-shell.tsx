'use client'

import React from 'react'
import { Plus, Search, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { ViewSwitcher } from './view-switcher'
import { ViewType } from './types'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'

interface CrudPageShellProps {
  title: string
  showTitle?: boolean
  icon: React.ElementType
  onAdd?: () => void

  // Search & View
  view: ViewType
  setView: (view: ViewType) => void
  enabledViews?: ViewType[]
  searchInput: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string

  // Data info
  totalItems: number

  // Infinite scroll
  isFetchingMore?: boolean

  // Filters & Actions
  filters?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode

  isLoading?: boolean
}

export function CrudPageShell({
  title,
  showTitle = true,
  icon: Icon,
  onAdd,
  view,
  setView,
  enabledViews,
  searchInput,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  totalItems,
  isFetchingMore = false,
  filters,
  actions,
  children,
  isLoading,
}: CrudPageShellProps) {
  const isMobile = useIsMobile()

  // Auto-switch to cards on mobile — list and kanban require desktop
  React.useEffect(() => {
    if (isMobile && (view === 'list' || view === 'kanban')) {
      setView('cards')
    }
  }, [isMobile, view, setView])

  return (
    <section className="bg-background flex h-full flex-col overflow-hidden">
      {!isMobile && (
        <>
          {/* Page Header */}
          <div className="border-border bg-background mt-6 flex flex-col border-b">
            {showTitle && (
              <div className="flex flex-col gap-2 px-6 py-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-foreground text-lg font-bold tracking-tight">{title}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-3">{actions}</div>
              </div>
            )}
            <div className="px-6 pb-2">
              <ViewSwitcher
                view={view}
                setView={setView}
                enabledViews={enabledViews}
                className="-ml-3"
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="border-border/50 bg-muted/5 flex items-center gap-4 border-b px-6 py-3">
            <div className="flex flex-1 items-center gap-2 overflow-x-auto">
              <div className="relative w-full max-w-[320px]">
                <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder={searchPlaceholder}
                  className="border-border bg-background focus-visible:ring-ring h-8 rounded-md pl-9 text-xs transition-all focus-visible:ring-1"
                  value={searchInput}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
              {filters && (
                <>
                  <div className="bg-border mx-2 h-4 w-[1px] shrink-0" />
                  {filters}
                </>
              )}
            </div>
            {!isLoading && (
              <div className="text-muted-foreground shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-widest">
                <span className="text-foreground font-bold">{totalItems}</span> itens
              </div>
            )}
          </div>
        </>
      )}

      {isMobile && (
        <div className="bg-background flex flex-col gap-3 border-b p-4">
          {showTitle && (
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">{title}</h1>
              {!isLoading && (
                <span className="text-muted-foreground text-[11px] font-medium">
                  {totalItems} itens
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder={searchPlaceholder}
                className="border-border bg-muted/50 h-10 rounded-full pl-10 pr-4"
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            {filters && (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-border h-10 w-10 shrink-0 rounded-full"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="mx-auto w-full max-w-md">
                    <DrawerHeader className="border-b pb-4">
                      <DrawerTitle>Filtros</DrawerTitle>
                    </DrawerHeader>
                    <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">{filters}</div>
                    <DrawerFooter className="bg-muted/30 border-t pt-4">
                      <DrawerClose asChild>
                        <Button className="h-12 w-full font-bold uppercase tracking-widest">
                          Aplicar Filtros
                        </Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="scrollbar-thin scrollbar-thumb-border flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
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

      {/* FAB */}
      {onAdd && (
        <Button
          onClick={onAdd}
          size="icon"
          className="hover:shadow-primary/40 animate-in fade-in zoom-in fixed bottom-20 right-8 z-50 h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}
    </section>
  )
}
