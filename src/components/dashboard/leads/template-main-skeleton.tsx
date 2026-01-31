'use client'

import { Skeleton } from '@/components/ui/skeleton'

type TemplateMainSkeletonProps = {
  rows?: number
}

export function TemplateMainSkeleton({ rows = 8 }: TemplateMainSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/5 bg-muted/30 p-4 backdrop-blur">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-muted/30 p-4 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-[220px]">
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-background/60 px-2 py-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-background/80 shadow-lg">
        <div className="border-b border-white/5 bg-muted/20 px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="border-b border-white/5 px-4 py-4 last:border-b-0"
          >
            <div className="grid grid-cols-[1.8fr_minmax(120px,0.8fr)_minmax(140px,0.9fr)_minmax(160px,0.9fr)_minmax(120px,0.6fr)] items-center gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex min-w-0 flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 justify-self-end" />
              <Skeleton className="h-4 w-28 justify-self-end" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
