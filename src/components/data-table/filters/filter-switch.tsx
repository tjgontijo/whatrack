'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
  (
    { checked, onChange, label, disabled = false, className },
    ref
  ) => {
    return (
      <div className={cn('flex items-center gap-3 rounded-md border bg-background px-3 py-2', className)}>
        <Label
          htmlFor={`switch-${label}`}
          className="text-xs font-medium uppercase tracking-wide cursor-pointer flex-1"
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
