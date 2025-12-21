'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  className?: string
  disabled?: boolean
}

/**
 * FloatingActionButton - FAB component for primary actions
 *
 * Features:
 * - Fixed position in bottom-right corner
 * - Primary color from system theme
 * - Hover effects
 * - Hidden on mobile by default (configurable)
 * - Accessible with aria labels
 */
export const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(
  (
    { icon: Icon, label, onClick, className, disabled = false },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className={cn(
          'fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 p-0',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'transition-all duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'active:scale-95',
          'z-40',
          className
        )}
        aria-label={label}
      >
        <Icon className="h-6 w-6" />
      </Button>
    )
  }
)

FloatingActionButton.displayName = 'FloatingActionButton'
