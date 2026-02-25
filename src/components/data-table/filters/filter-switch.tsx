'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/utils'

interface FilterSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

/**
 * FilterSwitch - Toggle switch for boolean filters
 *
 * Features:
 * - Label integration
 * - Disabled state
 * - Fully controlled component
 */
export const FilterSwitch = React.forwardRef<HTMLButtonElement, FilterSwitchProps>(
  ({ checked, onChange, label, disabled = false, className }, ref) => {
    return (
      <div
        className={cn(
          'bg-background flex items-center gap-3 rounded-md border px-3 py-2',
          className
        )}
      >
        <Label
          htmlFor={`switch-${label}`}
          className="flex-1 cursor-pointer text-xs font-medium uppercase tracking-wide"
        >
          {label}
        </Label>
        <Switch
          ref={ref}
          id={`switch-${label}`}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    )
  }
)

FilterSwitch.displayName = 'FilterSwitch'
