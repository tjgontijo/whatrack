'use client'

import * as React from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableEmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * DataTableEmptyState - Empty state display for tables
 *
 * Features:
 * - Customizable icon, title, description
 * - Optional action button
 */
export const DataTableEmptyState = React.forwardRef<
  HTMLDivElement,
  DataTableEmptyStateProps
>(
  (
    {
      title = 'Nenhum resultado encontrado',
      description = 'Tente ajustar seus filtros ou critérios de busca',
      icon,
      action,
      className,
    },
    ref
  ) => {
    const defaultIcon = icon || <Search className="h-12 w-12 text-muted-foreground" />

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed py-12 px-4',
          className
        )}
      >
        <div className="mb-4 text-muted-foreground">{defaultIcon}</div>
        <h3 className="mb-2 text-center font-semibold text-foreground">{title}</h3>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          {description}
        </p>
        {action}
      </div>
    )
  }
)

DataTableEmptyState.displayName = 'DataTableEmptyState'

/**
 * DataTableErrorState - Error state display for tables
 */
interface DataTableErrorStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const DataTableErrorState = React.forwardRef<
  HTMLDivElement,
  DataTableErrorStateProps
>(
  (
    {
      title = 'Erro ao carregar dados',
      description = 'Ocorreu um erro ao carregar os dados. Tente novamente.',
      action,
      className,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-12 px-4',
          className
        )}
      >
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h3 className="mb-2 text-center font-semibold text-foreground">{title}</h3>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          {description}
        </p>
        {action}
      </div>
    )
  }
)

DataTableErrorState.displayName = 'DataTableErrorState'
