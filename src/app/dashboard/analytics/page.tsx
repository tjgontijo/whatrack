import { Suspense } from 'react';
import AnalyticsDashboard from './components/AnalyticsDashboard';

export const metadata = {
    title: 'WhaTrack | Analytics',
    description: 'Métricas de SLA, funil de conversão e engajamento.',
};

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col h-full w-full bg-background/50 p-6 gap-6">
            <div className="flex flex-col">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
                <p className="text-muted-foreground mt-1 text-sm">Visão geral do desempenho da sua equipe no WhatsApp.</p>
            </div>

            <Suspense fallback={<div className="animate-pulse bg-muted rounded-xl h-96 w-full"></div>}>
                <AnalyticsDashboard />
            </Suspense>
        </div>
    );
}
