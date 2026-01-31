'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  stats?: Array<{
    label: string
    value: string | number
    change?: string
  }>
  className?: string
  children?: React.ReactNode
}

/**
 * PageHeader - Cabeçalho de página com título/descrição e estatísticas
 *
 * Layout:
 * Desktop: [Título + Descrição]    [Métrica 1]
 *          [                    ]    [Métrica 2]
 *          [                    ]    [Métrica 3]
 *
 * Mobile: Stacked vertical
 */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, stats, className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          className
        )}
      >
        {/* Duas colunas: Título/Descrição (esquerda) e Métricas (direita) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Coluna Esquerda: Título + Descrição */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>

          {/* Coluna Direita: Estatísticas (inline, alinhadas bottom-right) */}
          {stats && stats.length > 0 && (
            <div className="flex items-end gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-right"
                >
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </div>
                  <div className="flex items-baseline justify-end gap-1 mt-1">
                    <div className="text-lg font-bold">
                      {stat.value}
                    </div>
                    {stat.change && (
                      <div className="text-xs font-medium text-green-600">
                        {stat.change}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {children}
      </div>
    )
  }
)

PageHeader.displayName = 'PageHeader'
