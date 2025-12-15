'use client'

import * as React from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HeaderActions } from '@/components/dashboard/header-actions'
import { RefreshCw } from 'lucide-react'
import { DashboardMetricCard, DashboardMetricGrid } from '@/components/dashboard/charts/card'
import { DashboardPieChart } from '@/components/dashboard/charts/pie'
import { FunnelChart } from '@/components/dashboard/charts/funnel-chart'
import { MetaAdsCampaignsTable } from '@/components/dashboard/charts/meta-ads-campaigns-table'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { ORGANIZATION_HEADER } from '@/lib/auth/organization'
import { authClient } from '@/lib/auth/auth-client'
import {
  dashboardSummaryResponseSchema,
  type DashboardSummaryResponse,
} from '@/lib/schema/dashboard-summary'

const NO_TRAFFIC_SOURCE_VALUE = '__no-source__'

const filterOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const dashboardFiltersSchema = z.object({
  period: z.string(),
  trafficSource: z.string(),
  trafficType: z.string(),
  serviceCategory: z.string(),
  product: z.string(),
})

type FilterOption = z.infer<typeof filterOptionSchema>
type DashboardFilters = z.infer<typeof dashboardFiltersSchema>

const periodOptions = filterOptionSchema.array().parse([
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Últimos 3 dias', value: '3d' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 15 dias', value: '15d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 60 dias', value: '60d' },
  { label: 'Últimos 90 dias', value: '90d' },
  { label: 'Este mês', value: 'thisMonth' },
  { label: 'Mês anterior', value: 'lastMonth' },
  { label: 'Intervalo customizado', value: 'custom' },
]) satisfies FilterOption[]

const defaultFilters: DashboardFilters = dashboardFiltersSchema.parse({
  period: periodOptions.find((option) => option.value === '7d')?.value ?? '7d',
  trafficSource: 'any',
  trafficType: 'any',
  serviceCategory: 'any',
  product: 'any',
})

export default function DashboardPage() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [filters, setFilters] = React.useState<DashboardFilters>(defaultFilters)

  const handleFilterChange = React.useCallback(
    <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const { data, isFetching, refetch } = useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard-summary', filters, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organização não encontrada')
      }

      const url = new URL('/api/v1/dashboard/summary', window.location.origin)
      url.searchParams.set('period', filters.period)
      url.searchParams.set('trafficSource', filters.trafficSource)
      url.searchParams.set('trafficType', filters.trafficType)
      url.searchParams.set('product', filters.product)

      const response = await fetch(url.toString(), {
        headers: {
          [ORGANIZATION_HEADER]: organizationId,
        },
      })
      if (!response.ok) throw new Error('Falha ao carregar resumo')
      const json = await response.json()
      return dashboardSummaryResponseSchema.parse(json)
    },
    // Cache por 2 minutos - dados do dashboard não mudam com tanta frequência
    staleTime: 2 * 60 * 1000,
  })

  const handleApplyFilters = React.useCallback(() => {
    void refetch()
  }, [refetch])

  const pieData = data?.salesByService ?? []

  const productFilters = data?.productFilters

  const serviceCategoryOptions = React.useMemo<FilterOption[]>(() => {
    if (!productFilters) return [{ label: 'Qualquer', value: 'any' }]
    return productFilters.categories
  }, [productFilters])

  const productOptions = React.useMemo<FilterOption[]>(() => {
    if (!productFilters) return [{ label: 'Qualquer', value: 'any' }]
    const category = filters.serviceCategory || 'any'
    const options = productFilters.productsByCategory[category] ?? productFilters.productsByCategory.any
    return (options as FilterOption[]) ?? [{ label: 'Qualquer', value: 'any' }]
  }, [filters.serviceCategory, productFilters])

  const funnelSteps = React.useMemo(() => {
    const funnel = data?.funnel
    return [
      { label: 'Leads', value: funnel?.leads ?? 0 },
      { label: 'Agendamentos', value: funnel?.schedules ?? 0 },
      { label: 'Comparecimentos', value: funnel?.attendances ?? 0 },
      { label: 'Vendas', value: funnel?.sales ?? 0 },
    ]
  }, [data?.funnel])

  const trafficTypeOptions = React.useMemo<FilterOption[]>(() => {
    const types = data?.trafficTypes ?? ['any']

    const mapped: FilterOption[] = types.map((value) => {
      if (value === 'any') return { label: 'Qualquer', value: 'any' }
      if (value === 'paid') return { label: 'Pago', value: 'paid' }
      if (value === 'organic') return { label: 'Orgânico', value: 'organic' }
      return { label: value, value }
    })

    const deduped = mapped.filter(
      (option, index, self) => self.findIndex((item) => item.value === option.value) === index,
    )

    return deduped
  }, [data?.trafficTypes])

  const trafficSourceOptions = React.useMemo<FilterOption[]>(() => {
    const sources = data?.trafficSources ?? []
    const mapped = sources.map((source) =>
      source == null
        ? { label: 'Sem origem', value: NO_TRAFFIC_SOURCE_VALUE }
        : { label: source, value: source },
    )

    const deduped = mapped.filter(
      (option, index, self) => self.findIndex((item) => item.value === option.value) === index,
    )

    const options: FilterOption[] = [{ label: 'Qualquer', value: 'any' }, ...deduped]

    if (
      filters.trafficSource !== 'any' &&
      !options.some((option) => option.value === filters.trafficSource)
    ) {
      const fallbackLabel =
        filters.trafficSource === NO_TRAFFIC_SOURCE_VALUE ? 'Sem origem' : filters.trafficSource
      return [{ label: fallbackLabel, value: filters.trafficSource }, ...options]
    }

    return options
  }, [data?.trafficSources, filters.trafficSource])

  return (
    <>
      <HeaderActions>
        <Button variant="ghost" size="sm" onClick={handleApplyFilters}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </HeaderActions>

      <div className="space-y-8" data-testid="dashboard-page">
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm" data-testid="dashboard-filters">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label="Período"
              value={filters.period}
              options={periodOptions}
              onValueChange={(value) => handleFilterChange('period', value)}
            />
            <FilterSelect
              label="Tipo de tráfego"
              value={filters.trafficType}
              options={trafficTypeOptions}
              onValueChange={(value) => handleFilterChange('trafficType', value)}
            />
            <FilterSelect
              label="Fonte de tráfego"
              value={filters.trafficSource}
              options={trafficSourceOptions}
              onValueChange={(value) => handleFilterChange('trafficSource', value)}
            />
            <FilterSelect
              label="Categoria de serviço"
              value={filters.serviceCategory}
              options={serviceCategoryOptions}
              onValueChange={(value) => {
                handleFilterChange('serviceCategory', value)
                // sempre que a categoria mudar, resetamos o produto para 'any'
                handleFilterChange('product', 'any')
              }}
            />
            <FilterSelect
              label="Produto/Serviço"
              value={filters.product}
              options={productOptions}
              onValueChange={(value) => handleFilterChange('product', value)}
              disabled={filters.serviceCategory === 'any'}
            />
          </div>
        </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <DashboardMetricGrid>
          <DashboardMetricCard
            title="Faturamento"
            value={<span>{formatCurrencyBRL(data?.netRevenue ?? 0)}</span>}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Investimento em Anúncios"
            value={<span>{formatCurrencyBRL(data?.investment ?? 0)}</span>}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Custo dos Serviços"
            value={<span>{formatCurrencyBRL(data?.productsCost ?? 0)}</span>}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Lucro Bruto"
            value={<span>{formatCurrencyBRL(data?.grossProfit ?? 0)}</span>}
            isLoading={isFetching}
          />
          <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md xl:col-span-1 xl:row-span-3 md:col-span-1 md:row-span-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Distribuição de vendas por serviço</h3>
            </header>
            <div className="mt-4">
              {isFetching ? (
                <div className="flex h-[300px] items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground" />
                </div>
              ) : (
                <DashboardPieChart
                  data={pieData}
                  className="border-none bg-transparent p-0 shadow-none"
                  height={300}
                />
              )}
            </div>
          </div>
          <DashboardMetricCard
            title="Lucro Líquido"
            value={<span>{formatCurrencyBRL(data?.netProfit ?? 0)}</span>}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="ROAS (Faturamento / Investimento)"
            value={
              <span>{data?.roas != null ? data.roas.toFixed(2) : '—'}</span>
            }
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="ROI (Lucro / Investimento)"
            value={<span>{data?.roi != null ? data.roi.toFixed(2) : '—'}</span>}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="CAC"
            value={
              <span>
                {data?.cards.cac != null ? formatCurrencyBRL(data.cards.cac) : '—'}
              </span>
            }
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Ticket Médio"
            value={
              <span>
                {data?.cards.ticket != null ? formatCurrencyBRL(data.cards.ticket) : '—'}
              </span>
            }
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Número de Vendas"
            value={<span>{data?.sales ?? 0}</span>}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Serviços Prestados"
            value={<span>{data?.servicesCount ?? 0}</span>}
            isLoading={isFetching}
          />
          <div className="xl:col-span-4 xl:row-span-2 md:col-span-2 md:row-span-2">
            <FunnelChart steps={funnelSteps} />
          </div>
          <div className="xl:col-span-4 xl:row-span-3 md:col-span-2 md:row-span-3">
            <MetaAdsCampaignsTable rows={data?.paidCampaigns ?? []} isLoading={isFetching} className="h-full" />
          </div>
        </DashboardMetricGrid>
      </section>
      </div>
    </>
  )
}

type FilterSelectProps = {
  label: string
  value: string
  options: FilterOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
}

function FilterSelect({ label, value, options, onValueChange, disabled }: FilterSelectProps) {
  return (
    <div className="w-full space-y-2">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-12 w-full items-center justify-between rounded-xl border-border/80 bg-muted/20 px-3 disabled:cursor-not-allowed disabled:opacity-60">
          <SelectValue placeholder="Selecionar" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
