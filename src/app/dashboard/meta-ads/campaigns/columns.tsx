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
    metaProfit: number
    metaCpa: number
    metaRoas: number

    initiateCheckout: number
    metaCti: number
    landingPageViews: number
    metaCpv: number
    addsToCart: number
    metaCpatc: number

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
    },
    {
        accessorKey: 'budget',
        header: () => <div className="text-center">Orçamento</div>,
        cell: ({ row }) => {
            const req = row.original
            const val = req.dailyBudget
                ? formatCurrency(req.dailyBudget) + '/dia'
                : req.lifetimeBudget
                    ? formatCurrency(req.lifetimeBudget) + ' (V)'
                    : '—'
            return <div className="text-center font-medium">{val}</div>
        },
    },
    {
        accessorKey: 'metaRoas',
        header: () => <div className="text-center">ROI</div>,
        cell: ({ row }) => {
            const val = row.original.metaRoas
            return <div className="font-medium text-primary text-center">{val ? val.toFixed(2) : '—'}</div>
        },
    },
    {
        accessorKey: 'metaCpa',
        header: () => <div className="text-center">CPA</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.metaCpa)}</div>,
    },
    {
        accessorKey: 'metaPurchases',
        header: () => <div className="text-center">Vendas</div>,
        cell: ({ row }) => <div className="font-semibold text-center">{row.original.metaPurchases}</div>,
    },
    {
        accessorKey: 'metaProfit',
        header: () => <div className="text-center">Lucro</div>,
        cell: ({ row }) => {
            const val = row.original.metaProfit || 0
            const isNegative = val < 0
            return (
                <div className={`font-medium text-center ${isNegative ? 'text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                    {formatCurrency(val)}
                </div>
            )
        },
    },
    {
        accessorKey: 'spend',
        header: () => <div className="text-center">Gastos</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.spend)}</div>,
    },
    {
        accessorKey: 'metaRevenue',
        header: () => <div className="text-center">Faturamento</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.metaRevenue)}</div>,
    },
    {
        accessorKey: 'ctr',
        header: () => <div className="text-center">CTR</div>,
        cell: ({ row }) => <div className="text-center">{formatPercent(row.original.ctr)}</div>,
    },
    {
        accessorKey: 'clicks',
        header: () => <div className="text-center">Cliques</div>,
        cell: ({ row }) => <div className="text-center">{row.original.clicks}</div>,
    },
    {
        accessorKey: 'cpc',
        header: () => <div className="text-center">CPC</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.cpc)}</div>,
    },
    {
        accessorKey: 'landingPageViews',
        header: () => <div className="text-center">Vis. de Pág.</div>,
        cell: ({ row }) => <div className="text-center">{row.original.landingPageViews}</div>,
    },
    {
        accessorKey: 'metaCpv',
        header: () => <div className="text-center">CPV</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.metaCpv)}</div>,
    },
    {
        accessorKey: 'initiateCheckout',
        header: () => <div className="text-center">IC</div>,
        cell: ({ row }) => <div className="text-center">{row.original.initiateCheckout}</div>,
    },
    {
        accessorKey: 'metaCti',
        header: () => <div className="text-center">CTI</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.metaCti)}</div>,
    },
    {
        id: 'conversion',
        header: () => <div className="text-center">Conversão</div>,
        cell: ({ row }) => {
            const lpv = row.original.landingPageViews;
            const sales = row.original.metaPurchases;
            const cvr = lpv > 0 ? (sales / lpv) * 100 : 0;
            return <div className="text-center">{formatPercent(cvr)}</div>
        },
    },

    {
        accessorKey: 'impressions',
        header: () => <div className="text-center">Impressões</div>,
        cell: ({ row }) => <div className="text-center">{row.original.impressions.toLocaleString()}</div>,
    },
    {
        accessorKey: 'cpm',
        header: () => <div className="text-center">CPM</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.cpm)}</div>,
    },
    {
        accessorKey: 'reach',
        header: () => <div className="text-center">Alcance</div>,
        cell: ({ row }) => <div className="text-center">{row.original.reach.toLocaleString()}</div>,
    },
    {
        accessorKey: 'frequency',
        header: () => <div className="text-center">Frequência</div>,
        cell: ({ row }) => <div className="text-center">{row.original.frequency.toFixed(2)}</div>,
    },
    {
        accessorKey: 'addsToCart',
        header: () => <div className="text-center">ATC (Carrinho)</div>,
        cell: ({ row }) => <div className="text-center">{row.original.addsToCart}</div>,
    },
    {
        accessorKey: 'metaCpatc',
        header: () => <div className="text-center">Custo por ATC</div>,
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.original.metaCpatc)}</div>,
    },
]
