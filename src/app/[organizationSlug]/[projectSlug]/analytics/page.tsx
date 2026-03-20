import { Suspense } from 'react'
import { BarChart3 } from 'lucide-react'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { LoadingPage } from '@/components/dashboard/states'
import AnalyticsDashboard from './components/analytics-dashboard'

export const metadata = {
  title: 'WhaTrack | Analytics',
  description: 'Métricas de SLA, funil de conversão e engajamento.',
}

export default function AnalyticsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Visão geral do desempenho da sua equipe no WhatsApp."
        icon={BarChart3}
      />

      <PageContent>
        <Suspense fallback={<LoadingPage message="Carregando analytics..." />}>
          <AnalyticsDashboard />
        </Suspense>
      </PageContent>
    </PageShell>
  )
}
