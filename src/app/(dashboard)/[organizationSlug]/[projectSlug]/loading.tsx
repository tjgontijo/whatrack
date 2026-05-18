import { MetricsSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu projeto.</p>
      </div>
      <MetricsSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card shadow-sm p-6">
           <div className="h-[350px] w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="col-span-3 rounded-xl border bg-card shadow-sm p-6">
           <div className="h-[350px] w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
