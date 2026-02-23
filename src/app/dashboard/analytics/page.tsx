import { Suspense } from 'react'
import AnalyticsDashboard from './components/AnalyticsDashboard'

export const metadata = {
  title: 'WhaTrack | Analytics',
  description: 'Métricas de SLA, funil de conversão e engajamento.',
}

export default function AnalyticsPage() {
  return (
    <div className="bg-background/50 flex h-full w-full flex-col gap-6 p-6">
      <div className="flex flex-col">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Visão geral do desempenho da sua equipe no WhatsApp.
        </p>
      </div>

      <Suspense fallback={<div className="bg-muted h-96 w-full animate-pulse rounded-xl"></div>}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
