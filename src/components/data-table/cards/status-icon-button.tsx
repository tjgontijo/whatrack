'use client'

import * as React from 'react'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusIconButtonProps {
  hasData: boolean
  label: string
  onClick?: () => void
  activeIcon?: LucideIcon
  inactiveIcon?: LucideIcon
  activeClassName?: string
  inactiveClassName?: string
  count?: number
}

/**
 * StatusIconButton - Icon button that shows if data exists
 *
 * Features:
 * - Shows different icon based on data presence
 * - Disabled state when no data
 * - Optional count badge
 * - Color-customizable via className props
 */
export const StatusIconButton = React.forwardRef<
  HTMLButtonElement,
  StatusIconButtonProps
>(
  (
    {
      hasData,
      label,
      onClick,
      activeIcon,
      inactiveIcon,
      activeClassName,
      inactiveClassName,
      count,
    },
    ref
  ) => {
    const ActiveIcon = activeIcon ?? CheckCircle2
    const InactiveIcon = inactiveIcon ?? CircleDashed

    return (
      <button
        ref={ref}
        type="button"
        title={label}
        onClick={hasData ? onClick : undefined}
        disabled={!hasData}
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          hasData
            ? 'cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/40'
            : 'cursor-not-allowed opacity-50'
        )}
        aria-label={label}
      >
        {hasData ? (
          <ActiveIcon className={cn('h-4 w-4 text-emerald-600', activeClassName)} />
        ) : (
          <InactiveIcon className={cn('h-4 w-4 text-muted-foreground', inactiveClassName)} />
        )}

        {hasData && count !== undefined && count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    )
  }
)

StatusIconButton.displayName = 'StatusIconButton'
