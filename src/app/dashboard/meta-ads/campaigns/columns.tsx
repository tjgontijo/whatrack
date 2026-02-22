'use client'

import { ColumnDef } from '@tanstack/react-table'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

const formatPercent = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100)
}

const formatCurrency = formatCurrencyBRL


export type MetaCampaign = {
    id: string
    name: string
    status: string
    accountId: string
    accountName: string
    dailyBudget: number | null
    lifetimeBudget: number | null

    // Spend / Meta Data
    spend: number
    impressions: number
    clicks: number
    cpc: number
    ctr: number
    cpm: number
    reach: number
    frequency: number

    // Meta Actions
    metaPurchases: number
    metaRevenue: number
    metaCpa: number
    metaRoas: number

    initiateCheckout: number
    metaCti: number
    landingPageViews: number
    metaCpv: number
    addsToCart: number
    metaCpatc: number

    // Local Actions
    localPurchases: number
    localRevenue: number
    localRoi: number
    localCpa: number
    localProfit: number
}

// Map Meta API Status to readable labels/colors
const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
    'ACTIVE': { label: 'Ativa', variant: 'success' },
    'PAUSED': { label: 'Pausada', variant: 'secondary' },
    'ARCHIVED': { label: 'Arquivada', variant: 'outline' },
    'DELETED': { label: 'Excluída', variant: 'destructive' },
    'COMPLETED': { label: 'Concluída', variant: 'outline' },
}

export const campaignsColumns: ColumnDef<MetaCampaign>[] = [
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const val = row.original.status
            const status = statusMap[val] || { label: val, variant: 'outline' }
            return (
                <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${status.variant === 'success' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    <span className="text-xs font-medium text-muted-foreground">{status.label}</span>
                </div>
            )
        },
        enableHiding: true,
    },
    {
        accessorKey: 'name',
        header: 'Campanha',
        cell: ({ row }) => {
            return (
                <div className="flex flex-col min-w-[200px]">
                    <span className="font-medium text-sm text-foreground truncate max-w-[280px]" title={row.original.name}>
                        {row.original.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {row.original.accountName}
                    </span>
                </div>
            )
        },
        // Campanha is rarely hidden, but we can allow it
    },
    {
        accessorKey: 'budget',
        header: 'Orçamento',
        cell: ({ row }) => {
            const req = row.original
            if (req.dailyBudget) return formatCurrency(req.dailyBudget) + '/dia'
            if (req.lifetimeBudget) return formatCurrency(req.lifetimeBudget) + ' (V)'
            return '—'
        },
    },
    {
        accessorKey: 'localRoi',
        header: 'ROI (O/W)',
        cell: ({ row }) => {
            const val = row.original.localRoi
            return <div className="font-medium text-primary">{val ? val.toFixed(2) : '—'}</div>
        },
    },
    {
        accessorKey: 'localCpa',
        header: 'CPA (O)',
        cell: ({ row }) => formatCurrency(row.original.localCpa),
    },
    {
        accessorKey: 'localPurchases',
        header: 'Vendas (O)',
        cell: ({ row }) => <div className="font-semibold text-center">{row.original.localPurchases}</div>,
    },
    {
        accessorKey: 'localProfit',
        header: 'Lucro (O)',
        cell: ({ row }) => {
            const val = row.original.localProfit
            const isNegative = val < 0
            return (
                <div className={`font-medium ${isNegative ? 'text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                    {formatCurrency(val)}
                </div>
            )
        },
    },
    {
        accessorKey: 'spend',
        header: 'Gastos',
        cell: ({ row }) => formatCurrency(row.original.spend),
    },
    {
        accessorKey: 'localRevenue',
        header: 'Faturamento (O)',
        cell: ({ row }) => formatCurrency(row.original.localRevenue),
    },
    {
        accessorKey: 'ctr',
        header: 'CTR',
        cell: ({ row }) => formatPercent(row.original.ctr),
    },
    {
        accessorKey: 'clicks',
        header: 'Cliques',
        cell: ({ row }) => row.original.clicks,
    },
    {
        accessorKey: 'cpc',
        header: 'CPC',
        cell: ({ row }) => formatCurrency(row.original.cpc),
    },
    {
        accessorKey: 'landingPageViews',
        header: 'Vis. Pág. (LPV)',
        cell: ({ row }) => row.original.landingPageViews,
    },
    {
        accessorKey: 'metaCpv',
        header: 'CPV',
        cell: ({ row }) => formatCurrency(row.original.metaCpv),
    },
    {
        accessorKey: 'initiateCheckout',
        header: 'IC',
        cell: ({ row }) => row.original.initiateCheckout,
    },
    {
        accessorKey: 'metaCti',
        header: 'CTI',
        cell: ({ row }) => formatCurrency(row.original.metaCti),
    },

    // Extras / Ocultas por padrão
    {
        accessorKey: 'metaCpa',
        header: 'CPA (Meta)',
        cell: ({ row }) => formatCurrency(row.original.metaCpa),
    },
    {
        accessorKey: 'metaPurchases',
        header: 'Vendas (Meta) / Resultados',
        cell: ({ row }) => row.original.metaPurchases,
    },
    {
        accessorKey: 'impressions',
        header: 'Impressões',
        cell: ({ row }) => row.original.impressions.toLocaleString(),
    },
    {
        accessorKey: 'cpm',
        header: 'CPM',
        cell: ({ row }) => formatCurrency(row.original.cpm),
    },
    {
        accessorKey: 'reach',
        header: 'Alcance',
        cell: ({ row }) => row.original.reach.toLocaleString(),
    },
    {
        accessorKey: 'frequency',
        header: 'Frequência',
        cell: ({ row }) => row.original.frequency.toFixed(2),
    },
    {
        accessorKey: 'metaRoas',
        header: 'ROAS (Meta)',
        cell: ({ row }) => row.original.metaRoas.toFixed(2),
    },
    {
        accessorKey: 'addsToCart',
        header: 'Adições (ATC)',
        cell: ({ row }) => row.original.addsToCart,
    },
    {
        accessorKey: 'metaCpatc',
        header: 'Custo por ATC',
        cell: ({ row }) => formatCurrency(row.original.metaCpatc),
    },
]
