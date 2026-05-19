'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, RefreshCw } from 'lucide-react'
import * as React from 'react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { ExecutiveScorecard } from '@/features/dashboard/components/executive/executive-scorecard'
import { PageContent, PageHeader, PageShell } from '@/features/dashboard/components/layout'
import type { ExecutiveScorecardMetrics } from '@/features/dashboard/services/executive-scorecard.service'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { apiFetch } from '@/lib/http/api-client'

const filterOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

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
]) satisfies z.infer<typeof filterOptionSchema>[]

export default function DashboardPageClient() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()
  const [period, setPeriod] = React.useState('7d')

  const { data, isFetching, refetch } = useQuery<ExecutiveScorecardMetrics>({
    queryKey: ['executive-scorecard', period, organizationId, projectId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organização não encontrada')
      }

      const params = new URLSearchParams({
        period,
        ...(projectId ? { projectId } : {}),
      })

      const data = await apiFetch(`/api/v1/dashboard/executive-scorecard?${params}`, {
        orgId: organizationId,
      })
      return data as ExecutiveScorecardMetrics
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <PageShell>
      <PageHeader
        title='Scorecard Executivo'
        description='KPIs principais de receita e meta ads'
        icon={BarChart3}
        actions={
          <Button variant='ghost' size='sm' onClick={() => void refetch()}>
            <RefreshCw className='h-4 w-4' />
          </Button>
        }
      />

      <PageContent className='space-y-6'>
        {data && <ExecutiveScorecard metrics={data} isLoading={isFetching} />}
      </PageContent>
    </PageShell>
  )
}
