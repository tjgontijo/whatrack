'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FilterSelectOption {
  label: string
  value: string
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterSelectOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * FilterSelect - Select dropdown for filtering
 *
 * Features:
 * - Optional label
 * - Disabled state
 * - Fully controlled component
 */
export const FilterSelect = React.forwardRef<HTMLButtonElement, FilterSelectProps>(
  (
    {
      value,
      onChange,
      options,
      label,
      placeholder = 'Selecionar',
      disabled = false,
      className,
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </Label>
        )}
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            ref={ref}
            className={cn(
              'h-10 w-full items-center justify-between rounded-lg border-border/80 bg-muted/20',
              'disabled:cursor-not-allowed disabled:opacity-60',
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }
)

FilterSelect.displayName = 'FilterSelect'
