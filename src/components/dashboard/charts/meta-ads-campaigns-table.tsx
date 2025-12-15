'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { formatCurrencyBRL } from '@/lib/mask/formatters'

export type MetaAdsCampaignRow = {
  campaign: string | null
  adset: string | null
  ad: string | null
  investment: number
  revenue: number
  profit: number
  conversion: number | null
  roas: number | null
  cac: number | null
  leads: number
  schedules: number
  attendances: number
  sales: number
}

export type MetaAdsCampaignsTableProps = {
  title?: string
  rows?: MetaAdsCampaignRow[]
  isLoading?: boolean
  maxRows?: number
  className?: string
}

export function MetaAdsCampaignsTable({
  title = 'Campanhas Meta Ads',
  rows = [],
  isLoading,
  maxRows = 8,
  className,
}: MetaAdsCampaignsTableProps) {
  const visibleRows = React.useMemo(() => rows.slice(0, maxRows), [rows, maxRows])

  return (
    <section
      className={cn(
        'flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] backdrop-blur-sm',
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground/70">Campanha, conjunto e criativo com métricas consolidadas.</p>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
        </div>
      ) : visibleRows.length ? (
        <div className="flex-1 overflow-auto rounded-2xl border border-border/40">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Campanha</th>
                <th className="px-3 py-2 font-medium">Conjunto</th>
                <th className="px-3 py-2 font-medium">Criativo</th>
                <th className="px-3 py-2 font-medium text-right">Investimento</th>
                <th className="px-3 py-2 font-medium text-right">Receita</th>
                <th className="px-3 py-2 font-medium text-right">Lucro</th>
                <th className="px-3 py-2 font-medium text-right">ROAS</th>
                <th className="px-3 py-2 font-medium text-right">CAC</th>
                <th className="px-3 py-2 font-medium text-right">Leads</th>
                <th className="px-3 py-2 font-medium text-right">Agendamento</th>
                <th className="px-3 py-2 font-medium text-right">Comparecimento</th>
                <th className="px-3 py-2 font-medium text-right">Vendas</th>
                <th className="px-3 py-2 font-medium text-right">% Conversão</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr
                  key={`${row.campaign ?? 'camp'}-${row.adset ?? 'adset'}-${row.ad ?? 'ad'}-${index}`}
                  className="border-t border-border/40"
                >
                  <td className="px-3 py-2 font-medium text-foreground">{row.campaign ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.adset ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.ad ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyMaybe(row.investment)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyMaybe(row.revenue)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyMaybe(row.profit)}</td>
                  <td className="px-3 py-2 text-right">{row.roas != null ? row.roas.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyMaybe(row.cac)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatInteger(row.leads)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatInteger(row.schedules)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatInteger(row.attendances)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatInteger(row.sales)}</td>
                  <td className="px-3 py-2 text-right">{formatPercent(row.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
          Nenhum dado de campanha Meta Ads para o período selecionado.
        </div>
      )}
    </section>
  )
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

function formatCurrencyMaybe(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—'
  return formatCurrencyBRL(value)
}
