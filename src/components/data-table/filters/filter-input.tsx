'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  clearable?: boolean
  debounceMs?: number
  icon?: React.ReactNode
  /** Mostrar loading spinner */
  isLoading?: boolean
}

/**
 * FilterInput - Input component with optional debounce and clear button
 *
 * Features:
 * - Debounce support (default 400ms)
 * - Clear button when value is not empty
 * - Optional search icon
 * - Fully controlled component
 */
export const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      clearable = true,
      debounceMs = 400,
      icon,
      isLoading = false,
      className,
      placeholder = 'Pesquisar...',
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState(value)
    const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

    // Sync external value changes
    React.useEffect(() => {
      setDisplayValue(value)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setDisplayValue(newValue)

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue)
      }, debounceMs)
    }

    const handleClear = () => {
      setDisplayValue('')
      onChange('')
      onClear?.()
    }

    return (
      <div className="relative w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 flex items-center text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            type="text"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(
              'pr-10',
              icon && 'pl-10',
              className
            )}
            {...props}
          />
          {isLoading && (
            <Loader2
              className="absolute right-3 h-4 w-4 text-muted-foreground animate-spin"
              aria-hidden="true"
            />
          )}

          {clearable && displayValue && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 h-8 w-8 p-0 hover:bg-transparent"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
      </div>
    )
  }
)

FilterInput.displayName = 'FilterInput'
