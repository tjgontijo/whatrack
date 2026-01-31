'use client'

import React, { useState } from 'react'
import { Plus, SlidersHorizontal, Calendar, Search, Filter } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  TemplateMainShell,
  TemplateMainHeader,
  DataToolbar,
  ViewSwitcher,
  type ViewType,
  LeadsCardView,
  LeadsTableView,
  NewLeadDialog,
  EditLeadDialog,
  DeleteLeadDialog,
} from '@/components/dashboard/leads'
import { useIsMobile } from '@/hooks/use-mobile'

import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Lead = {
  id: string
  name: string | null
  phone: string | null
  mail: string | null
  remoteJid: string | null
  createdAt: Date
}

type ApiResponse = {
  items: Lead[]
  total: number
  page: number
  pageSize: number
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '3d', label: '3 dias' },
  { value: '7d', label: '7 dias' },
  { value: '15d', label: '15 dias' },
  { value: '30d', label: '30 dias' },
  { value: '60d', label: '60 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês anterior' },
]

export default function LeadsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [view, setView] = useState<ViewType>('list')
  const isMobile = useIsMobile()
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['phone', 'email', 'createdAt'])

  // Filters from URL
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '20', 10) || 20))
  const dateRange = searchParams.get('dateRange') || '7d'

  // Search input state with debounce
  const [searchInput, setSearchInput] = useState(q)

  React.useEffect(() => {
    setSearchInput(q)
  }, [q])

  React.useEffect(() => {
    const trimmed = searchInput.trim()

    if (trimmed.length === 0) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q')
        })
      }
      return undefined
    }

    if (trimmed.length < 3) {
      if (q) {
        updateQueryParams((params) => {
          params.delete('q')
        })
      }
      return undefined
    }

    if (trimmed === q) {
      return undefined
    }

    const handle = window.setTimeout(() => {
      updateQueryParams((params) => {
        params.set('q', trimmed)
      })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [searchInput, q])

  // Update query params helper
  const updateQueryParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      mutator(params)
      params.set('page', '1')
      router.push(`/dashboard/leads?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Period filter handler
  const handlePeriodChange = (newPeriod: string) => {
    updateQueryParams((params) => {
      params.set('dateRange', newPeriod)
    })
  }

  // Dialog states
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null)

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }

  // Fetch leads from API
  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ['leads', q, page, pageSize, dateRange] as const,
    queryFn: async (): Promise<ApiResponse> => {
      const u = new URL('/api/v1/leads', window.location.origin)
      if (q) u.searchParams.set('q', q)
      u.searchParams.set('page', String(page))
      u.searchParams.set('pageSize', String(pageSize))
      if (dateRange) u.searchParams.set('dateRange', dateRange)

      const res = await fetch(u.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch leads')
      return (await res.json()) as ApiResponse
    },
    placeholderData: (prev) => prev as ApiResponse | undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  })

  const leads = data?.items ?? []
  const total = data?.total ?? 0

  // Handlers
  const handleEdit = (leadId: string) => {
    setEditingLeadId(leadId)
  }

  const handleDelete = (leadId: string) => {
    setDeletingLeadId(leadId)
  }

  const handleView = (_leadId: string) => {
    // Lead detail page removed - noop for now
  }

  const handleOpenChat = (_leadId: string) => {
    // Chat page removed - noop for now
  }

  const getPeriodLabel = () => {
    const option = PERIOD_OPTIONS.find(o => o.value === dateRange)
    return option?.label || '7 dias'
  }

  return (
    <TemplateMainShell className="flex flex-col h-[calc(100vh-2rem)]">

      {/* MOBILE HEADER - Apenas Search + Filter Icon */}
      {isMobile && (
        <div className="flex items-center gap-3 border-b border-border bg-background px-3 pb-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              className="h-10 rounded-full border-border bg-muted/50 pl-10 pr-4"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full border-border">
                <Filter className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader className="text-left px-6 pt-6">
                  <DrawerTitle className="text-lg">Filtros</DrawerTitle>
                </DrawerHeader>

                <div className="px-6 py-4 space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">Período</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERIOD_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                            dateRange === option.value
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <input
                            type="radio"
                            name="period"
                            value={option.value}
                            checked={dateRange === option.value}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            className="sr-only"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <DrawerFooter className="px-6 pb-8">
                  <DrawerClose asChild>
                    <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                      Aplicar Filtros
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}

      {/* DESKTOP HEADER + TOOLBAR */}
      {!isMobile && (
        <>
          <TemplateMainHeader>
            <ViewSwitcher view={view} setView={setView} className="-ml-4 mt-2" />
          </TemplateMainHeader>


          <div className="border-b border-border bg-background/50 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <DataToolbar
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              searchPlaceholder="Buscar por nome, telefone, email..."
              filters={
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                        <Calendar className="h-3 w-3" />
                        <span>Período: {getPeriodLabel()}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>Selecionar Período</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {PERIOD_OPTIONS.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={dateRange === option.value}
                          onCheckedChange={() => handlePeriodChange(option.value)}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
              actions={
                view === 'list' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-2 text-xs">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Exibir</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={visibleColumns.includes('phone')}
                        onCheckedChange={() => toggleColumn('phone')}
                      >
                        Telefone
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={visibleColumns.includes('email')}
                        onCheckedChange={() => toggleColumn('email')}
                      >
                        Email
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={visibleColumns.includes('createdAt')}
                        onCheckedChange={() => toggleColumn('createdAt')}
                      >
                        Criado em
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              }
            />
          </div>
        </>
      )}

      {/* CONTENT AREA */}
      <div className={isMobile
        ? "flex-1 overflow-y-scroll bg-muted/5 p-3 scrollbar-hide"
        : "flex-1 overflow-y-auto bg-muted/5 p-6"
      }>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Carregando leads...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">Erro ao carregar leads</p>
          </div>
        ) : isMobile ? (
          <LeadsCardView
            leads={leads}
            onView={handleView}
            onChat={handleOpenChat}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <>
            {view === 'list' && (
              <LeadsTableView
                leads={leads}
                visibleColumns={visibleColumns}
                onView={handleView}
                onChat={handleOpenChat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
            {view === 'cards' && (
              <LeadsCardView
                leads={leads}
                onView={handleView}
                onChat={handleOpenChat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>




      {editingLeadId && (
        <EditLeadDialog
          leadId={editingLeadId}
          open={Boolean(editingLeadId)}
          onOpenChange={(open) => !open && setEditingLeadId(null)}
        />
      )}

      {deletingLeadId && (
        <DeleteLeadDialog
          leadId={deletingLeadId}
          open={Boolean(deletingLeadId)}
          onOpenChange={(open) => !open && setDeletingLeadId(null)}
        />
      )}
    </TemplateMainShell>
  )
}
