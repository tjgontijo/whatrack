import { BarChart3 } from 'lucide-react'
import { Suspense } from 'react'
import { PageContent, PageHeader, PageShell } from '@/features/dashboard/components/layout'
import { LoadingPage } from '@/features/dashboard/components/states'
import AnalyticsDashboard from './components/analytics-dashboard'

export const metadata = {
  title: 'WhaTrack | Analytics',
  description: 'Métricas de SLA, funil de conversão e engajamento.',
}

import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type AnalyticsPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const { organizationSlug, projectSlug } = await params
  const { startDate: startDateParam, endDate: endDateParam } = await searchParams

  const access = await requireWorkspacePageAccess({
    organizationSlug,
    permissions: 'view:analytics',
  })

  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const endDate = endDateParam ? new Date(endDateParam) : new Date()

  return (
    <PageShell>
      <PageHeader
        title='Analytics'
        description='Visão geral do desempenho da sua equipe no WhatsApp.'
        icon={BarChart3}
      />

      <PageContent>
        <AnalyticsDashboard
          organizationId={access.organizationId}
          startDate={startDate}
          endDate={endDate}
        />
      </PageContent>
    </PageShell>
  )
}
