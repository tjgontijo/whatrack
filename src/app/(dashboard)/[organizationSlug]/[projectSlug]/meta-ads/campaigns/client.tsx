'use client'

import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { RefreshCw, Search, Settings2 } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/api-client'
import { campaignsColumns, type MetaCampaign } from './columns'

const COLUMN_NAMES: Record<string, string> = {
  status: 'Status',
  name: 'Campanha',
  budget: 'Orçamento',
  spend: 'Gastos',
  ctr: 'CTR',
  clicks: 'Cliques',
  cpc: 'CPC',
  landingPageViews: 'Visitas Pág. (LPV)',
  metaCpv: 'CPV',
  initiateCheckout: 'Checkouts Inic. (IC)',
  metaCti: 'CTI',
  metaCpa: 'CPA',
  metaPurchases: 'Vendas',
  metaRevenue: 'Faturamento',
  metaProfit: 'Lucro',
  conversion: 'Conversão',
  impressions: 'Impressões',
  cpm: 'CPM',
  reach: 'Alcance',
  frequency: 'Frequência',
  metaRoas: 'ROI',
  addsToCart: 'Adições Ca. (ATC)',
  metaCpatc: 'Custo por ATC',
}

// Columns hidden by default
const DEFAULT_HIDDEN_COLUMNS = {
  metaCpa: false,
  metaPurchases: false,
  impressions: false,
  cpm: false,
  reach: false,
  frequency: false,
  metaRoas: false,
  addsToCart: false,
  metaCpatc: false,
}

export function MetaAdsCampaignsClient() {
  const { organizationId } = useRequiredProjectRouteContext()

  const [days, setDays] = useState('1')
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [accountFilter, setAccountFilter] = useState('ALL')
  const [onlyWithSpend, setOnlyWithSpend] = useState(true)

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN_COLUMNS)

  const {
    data: campaigns,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<MetaCampaign[]>({
    queryKey: ['meta-campaigns', organizationId, days],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization selected')
      const data = await apiFetch(`/api/v1/meta-ads/campaigns?days=${days}`, {
        orgId: organizationId,
      })
      return data as MetaCampaign[]
    },
    enabled: !!organizationId,
    refetchOnWindowFocus: false,
  })

  const uniqueAccounts = React.useMemo(() => {
    if (!campaigns) return []
    const accMap = new Map<string, string>()
    campaigns.forEach((c) => {
      if (!accMap.has(c.accountId)) {
        accMap.set(c.accountId, c.accountName)
      }
    })
    return Array.from(accMap.entries()).map(([id, name]) => ({ id, name }))
  }, [campaigns])

  const filteredData = React.useMemo(() => {
    let currentData = campaigns || []

    if (statusFilter !== 'ALL') {
      currentData = currentData.filter((c) => c.status === statusFilter)
    }

    if (accountFilter !== 'ALL') {
      currentData = currentData.filter((c) => c.accountId === accountFilter)
    }

    if (onlyWithSpend) {
      currentData = currentData.filter((c) => c.spend > 0)
    }

    return currentData
  }, [campaigns, statusFilter, accountFilter, onlyWithSpend])

  const table = useReactTable({
    data: filteredData,
    columns: campaignsColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  if (!organizationId) return null

  return (
    <div className='flex w-full min-w-0 flex-col space-y-4'>
      {/* Toolbar */}
      <div className='flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-white p-4 shadow-sm md:flex-row md:items-center'>
        <div className='flex w-full flex-1 flex-col flex-wrap gap-4 md:flex-row'>
          {/* Search Component */}
          <div className='relative w-full max-w-sm flex-1 md:w-auto'>
            <Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Buscar campanha...'
              className='pl-9'
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {/* Account Filter */}
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className='w-full md:w-[220px]'>
              <SelectValue placeholder='Conta de Anúncio' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>Todas as contas</SelectItem>
              {uniqueAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>Todos os status</SelectItem>
              <SelectItem value='ACTIVE'>Ativas</SelectItem>
              <SelectItem value='PAUSED'>Pausadas</SelectItem>
              <SelectItem value='COMPLETED'>Concluídas</SelectItem>
            </SelectContent>
          </Select>

          {/* Days Filter */}
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Período' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='1'>Hoje</SelectItem>
              <SelectItem value='7'>Últimos 7 dias</SelectItem>
              <SelectItem value='14'>Últimos 14 dias</SelectItem>
              <SelectItem value='30'>Últimos 30 dias</SelectItem>
              <SelectItem value='90'>Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-wrap items-center gap-4 self-end md:self-auto'>
          <div className='flex items-center space-x-2'>
            <label
              htmlFor='spend-filter'
              className='whitespace-nowrap font-medium text-muted-foreground text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Com gastos
            </label>
            <Switch id='spend-filter' checked={onlyWithSpend} onCheckedChange={setOnlyWithSpend} />
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className='h-10'
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {/* Toggle Columns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='h-10'>
                <Settings2 className='mr-2 h-4 w-4' />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-[240px]'>
              <DropdownMenuLabel>Métricas Exibidas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className='h-[300px]'>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className='cursor-pointer capitalize'
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {COLUMN_NAMES[column.id] || column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Area */}
      <div className='relative w-full overflow-hidden rounded-xl border bg-card bg-white text-card-foreground shadow-sm'>
        {isLoading ? (
          <div className='flex h-64 flex-col items-center justify-center bg-muted/5'>
            <RefreshCw className='mb-4 h-8 w-8 animate-spin text-muted-foreground/30' />
            <p className='font-medium text-muted-foreground text-sm'>
              Carregando métricas de campanhas...
            </p>
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center justify-center p-12 text-center text-muted-foreground'>
            <p className='font-medium text-destructive'>Erro ao carregar dados.</p>
            <p className='text-sm'>Verifique suas conexões do Meta Ads.</p>
          </div>
        ) : (
          <Table className='w-full text-sm'>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='h-11 whitespace-nowrap border-b bg-muted/40 px-4 py-3 font-semibold text-muted-foreground'
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className='border-b transition-colors hover:bg-muted/30'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='bg-white px-4 py-3 align-middle'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={campaignsColumns.length} className='h-24 text-center'>
                    Nenhuma campanha encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
