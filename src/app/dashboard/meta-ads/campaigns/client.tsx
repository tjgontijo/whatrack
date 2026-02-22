'use client'

import React, { useState } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { useQuery } from '@tanstack/react-query'
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
    VisibilityState,
} from '@tanstack/react-table'
import { campaignsColumns, MetaCampaign } from './columns'
import { RefreshCw, Search, SlidersHorizontal, Settings2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

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
    const { data: session } = authClient.useSession()
    const { data: activeOrg } = authClient.useActiveOrganization()
    const organizationId = activeOrg?.id

    const [days, setDays] = useState('30')
    const [globalFilter, setGlobalFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN_COLUMNS)

    const { data: campaigns, isLoading, isError, refetch, isRefetching } = useQuery<MetaCampaign[]>({
        queryKey: ['meta-campaigns', organizationId, days],
        queryFn: async () => {
            if (!organizationId) throw new Error("No organization selected")
            const response = await fetch(`/api/v1/meta-ads/campaigns?organizationId=${organizationId}&days=${days}`)
            if (!response.ok) throw new Error("Failed to fetch campaigns")
            return response.json()
        },
        enabled: !!organizationId,
        refetchOnWindowFocus: false,
    })

    const filteredData = React.useMemo(() => {
        let currentData = campaigns || []
        if (statusFilter !== 'ALL') {
            currentData = currentData.filter(c => c.status === statusFilter)
        }
        return currentData
    }, [campaigns, statusFilter])

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
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                    {/* Search Component */}
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar campanha..."
                            className="pl-9"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os status</SelectItem>
                            <SelectItem value="ACTIVE">Ativas</SelectItem>
                            <SelectItem value="PAUSED">Pausadas</SelectItem>
                            <SelectItem value="COMPLETED">Concluídas</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Days Filter */}
                    <Select value={days} onValueChange={setDays}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Hoje</SelectItem>
                            <SelectItem value="7">Últimos 7 dias</SelectItem>
                            <SelectItem value="14">Últimos 14 dias</SelectItem>
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                            <SelectItem value="90">Últimos 90 dias</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching || isLoading} className="h-10">
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    {/* Toggle Columns */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10">
                                <Settings2 className="mr-2 h-4 w-4" />
                                Colunas
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[240px]">
                            <DropdownMenuLabel>Métricas Exibidas</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <ScrollArea className="h-[300px]">
                                {table
                                    .getAllColumns()
                                    .filter(column => column.getCanHide())
                                    .map(column => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize cursor-pointer"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm bg-white overflow-hidden relative">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-muted/5">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-medium text-muted-foreground">Carregando métricas de campanhas...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <p className="text-destructive font-medium">Erro ao carregar dados.</p>
                        <p className="text-sm">Verifique suas conexões do Meta Ads.</p>
                    </div>
                ) : (
                    <ScrollArea className="max-w-full">
                        <div className="w-full">
                            <Table className="w-full text-sm">
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id} className="whitespace-nowrap px-4 py-3 bg-muted/40 font-semibold text-muted-foreground h-11 border-b">
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
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
                                                data-state={row.getIsSelected() && "selected"}
                                                className="border-b transition-colors hover:bg-muted/30"
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="px-4 py-3 align-middle bg-white">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={campaignsColumns.length} className="h-24 text-center">
                                                Nenhuma campanha encontrada com os filtros atuais.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                )}
            </div>
        </div>
    )
}
