'use client'

import * as React from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, RefreshCw, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { FilterSelect } from '@/components/dashboard/filters'
import { DashboardMetricCard, DashboardMetricGrid } from '@/components/dashboard/charts/card'
import { DashboardPieChart } from '@/components/dashboard/charts/pie'
import { FunnelChart } from '@/components/dashboard/charts/funnel-chart'
import { formatCurrencyBRL } from '@/lib/mask/formatters'
import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import { buildDashboardSummaryQuery } from '@/lib/dashboard/summary-query'

import {
  dashboardSummaryResponseSchema,
  type DashboardSummaryResponse,
} from '@/schemas/dashboard/dashboard-summary'

const NO_TRAFFIC_SOURCE_VALUE = '__no-source__'

const filterOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const dashboardFiltersSchema = z.object({
  period: z.string(),
  trafficSource: z.string(),
  trafficType: z.string(),
  itemCategory: z.string(),
  item: z.string(),
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
  itemCategory: 'any',
  item: 'any',
})

export default function DashboardPageClient() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
  const [filters, setFilters] = React.useState<DashboardFilters>(defaultFilters)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)

  const handleFilterChange = React.useCallback(
    <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const { data, isFetching, refetch } = useQuery<DashboardSummaryResponse>({
    queryKey: ['dashboard-summary', filters, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organização não encontrada')
      }

      const query = buildDashboardSummaryQuery(filters)
      const data = await apiFetch(`/api/v1/dashboard/summary?${query}`, {
        orgId: organizationId,
      })
      return dashboardSummaryResponseSchema.parse(data)
    },
    staleTime: 2 * 60 * 1000,
  })

  const pieData = data?.salesByService ?? []
  const itemFilters = data?.itemFilters

  const itemCategoryOptions = React.useMemo<FilterOption[]>(() => {
    if (!itemFilters) return [{ label: 'Qualquer', value: 'any' }]
    return itemFilters.categories
  }, [itemFilters])

  const itemOptions = React.useMemo<FilterOption[]>(() => {
    if (!itemFilters) return [{ label: 'Qualquer', value: 'any' }]
    const category = filters.itemCategory || 'any'
    const options =
      itemFilters.itemsByCategory[category] ?? itemFilters.itemsByCategory.any
    return (options as FilterOption[]) ?? [{ label: 'Qualquer', value: 'any' }]
  }, [filters.itemCategory, itemFilters])

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
      (option, index, self) => self.findIndex((item) => item.value === option.value) === index
    )

    return deduped
  }, [data?.trafficTypes])

  const trafficSourceOptions = React.useMemo<FilterOption[]>(() => {
    const sources = data?.trafficSources ?? []
    const mapped = sources.map((source) =>
      source == null
        ? { label: 'Sem origem', value: NO_TRAFFIC_SOURCE_VALUE }
        : { label: source, value: source }
    )

    const deduped = mapped.filter(
      (option, index, self) => self.findIndex((item) => item.value === option.value) === index
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
    <PageShell>
      <PageHeader
        title="Visão Geral"
        description="Acompanhe suas métricas em tempo real"
        icon={BarChart3}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto px-4 py-6">
                <SheetHeader className="mb-8">
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-8">
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
                    label="Categoria de item"
                    value={filters.itemCategory}
                    options={itemCategoryOptions}
                    onValueChange={(value) => {
                      handleFilterChange('itemCategory', value)
                      handleFilterChange('item', 'any')
                    }}
                  />
                  <FilterSelect
                    label="Item"
                    value={filters.item}
                    options={itemOptions}
                    onValueChange={(value) => handleFilterChange('item', value)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </>
        }
      />

      <PageContent className="space-y-6">
        <DashboardMetricGrid>
          <DashboardMetricCard
            title="Leads"
            value={data?.funnel.leads ?? 0}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Agendamentos"
            value={data?.funnel.schedules ?? 0}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Comparecimentos"
            value={data?.funnel.attendances ?? 0}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Vendas"
            value={data?.sales ?? 0}
            isLoading={isFetching}
          />
          <DashboardMetricCard
            title="Receita"
            value={formatCurrencyBRL(data?.cards.revenue ?? 0)}
            isLoading={isFetching}
          />
        </DashboardMetricGrid>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <FunnelChart
            title="Funil"
            description="Conversão das etapas principais"
            data={funnelSteps}
            loading={isFetching}
          />
          <DashboardPieChart
            title="Vendas por serviço"
            description="Distribuição da receita por item vendido"
            data={pieData}
            loading={isFetching}
          />
        </div>
      </PageContent>
    </PageShell>
  )
}
