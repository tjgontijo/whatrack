"use client"

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

const cardWidthClass = 'min-w-[240px] flex-1'

type DashboardMetricCardProps = {
  title: string
  value: ReactNode
  icon?: ReactNode
  trend?: ReactNode
  className?: string
  isLoading?: boolean
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2 | 3 | 4
}

const colSpanClasses: Record<NonNullable<DashboardMetricCardProps['colSpan']>, string> = {
  1: '',
  2: 'xl:col-span-2 md:col-span-2',
  3: 'xl:col-span-3 md:col-span-2',
  4: 'xl:col-span-4 md:col-span-2',
}

const rowSpanClasses: Record<NonNullable<DashboardMetricCardProps['rowSpan']>, string> = {
  1: '',
  2: 'xl:row-span-2 md:row-span-2',
  3: 'xl:row-span-3 md:row-span-3',
  4: 'xl:row-span-4 md:row-span-4',
}

export function DashboardMetricCard({
  title,
  value,
  icon,
  trend,
  className,
  isLoading,
  colSpan = 1,
  rowSpan = 1,
}: DashboardMetricCardProps) {
  const colSpanClass = colSpanClasses[colSpan]
  const rowSpanClass = rowSpanClasses[rowSpan]

  return (
    <div className={cn('col-span-1', colSpanClass, rowSpanClass)}>
      <article
        className={cn(
          cardWidthClass,
          'flex h-full flex-col rounded-3xl border border-border/50 bg-card p-6 shadow-[0px_18px_35px_-25px_rgba(15,23,42,0.25)] backdrop-blur-sm',
          'transition hover:-translate-y-0.5 hover:shadow-[0px_24px_45px_-28px_rgba(15,23,42,0.35)]',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-3 min-h-[32px] text-2xl font-semibold tracking-tight text-foreground" suppressHydrationWarning>
              {isLoading ? <span className="text-muted-foreground/30">—</span> : value}
            </div>
          </div>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </header>

        {trend && !isLoading ? <footer className="mt-4 text-xs font-medium text-emerald-600">{trend}</footer> : null}
      </article>
    </div>
  )
}

export function DashboardMetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2 grid-cols-1" style={{ gridAutoRows: '120px' }}>
      {children}
    </div>
  )
}
