'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * DataTableCard - Base container for mobile card display
 *
 * Features:
 * - Consistent styling with table rows
 * - Composable subcomponents
 * - Hover effects
 */
interface DataTableCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export const DataTableCard = React.forwardRef<HTMLDivElement, DataTableCardProps>(
  ({ children, onClick, className }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'border-border/50 bg-card rounded-lg border p-4',
          'transition-all duration-200 ease-out',
          'hover:border-border hover:shadow-md',
          onClick && 'cursor-pointer',
          className
        )}
      >
        {children}
      </div>
    )
  }
)

DataTableCard.displayName = 'DataTableCard'

/**
 * DataTableCardHeader - Header section with title and meta
 */
interface DataTableCardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCardHeader = React.forwardRef<HTMLDivElement, DataTableCardHeaderProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-border/30 mb-3 flex items-start justify-between gap-2 border-b pb-3',
          className
        )}
      >
        {children}
      </div>
    )
  }
)

DataTableCardHeader.displayName = 'DataTableCardHeader'

/**
 * DataTableCardTitle - Title text
 */
interface DataTableCardTitleProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCardTitle = React.forwardRef<HTMLHeadingElement, DataTableCardTitleProps>(
  ({ children, className }, ref) => {
    return (
      <h3 ref={ref} className={cn('text-foreground truncate text-sm font-semibold', className)}>
        {children}
      </h3>
    )
  }
)

DataTableCardTitle.displayName = 'DataTableCardTitle'

/**
 * DataTableCardMeta - Secondary info (e.g., timestamp)
 */
interface DataTableCardMetaProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCardMeta = React.forwardRef<HTMLDivElement, DataTableCardMetaProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('text-muted-foreground whitespace-nowrap text-xs', className)}>
        {children}
      </div>
    )
  }
)

DataTableCardMeta.displayName = 'DataTableCardMeta'

/**
 * DataTableCardContent - Main content area
 */
interface DataTableCardContentProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCardContent = React.forwardRef<HTMLDivElement, DataTableCardContentProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('mb-3 space-y-2', className)}>
        {children}
      </div>
    )
  }
)

DataTableCardContent.displayName = 'DataTableCardContent'

/**
 * DataTableCardRow - Label-value pair
 */
interface DataTableCardRowProps {
  label: string
  children: React.ReactNode
  className?: string
}

export const DataTableCardRow = React.forwardRef<HTMLDivElement, DataTableCardRowProps>(
  ({ label, children, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <span className="text-muted-foreground whitespace-nowrap text-xs font-medium uppercase tracking-wider">
          {label}:
        </span>
        <div className="flex-1 text-sm">{children}</div>
      </div>
    )
  }
)

DataTableCardRow.displayName = 'DataTableCardRow'

/**
 * DataTableCardFooter - Action buttons area
 */
interface DataTableCardFooterProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCardFooter = React.forwardRef<HTMLDivElement, DataTableCardFooterProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('border-border/30 flex items-center gap-2 border-t pt-3', className)}
      >
        {children}
      </div>
    )
  }
)

DataTableCardFooter.displayName = 'DataTableCardFooter'

/**
 * DataTableCardActions - Icon button row
 */
interface DataTableCardActionsProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCardActions = React.forwardRef<HTMLDivElement, DataTableCardActionsProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        {children}
      </div>
    )
  }
)

DataTableCardActions.displayName = 'DataTableCardActions'
