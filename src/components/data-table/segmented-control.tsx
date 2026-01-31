'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SegmentedOption<T = string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps<T = string> {
  /** Valor selecionado */
  value: T
  /** Callback de mudança de valor */
  onChange: (value: T) => void | any
  /** Opções disponíveis */
  options: SegmentedOption<T>[]
  /** Classe customizada */
  className?: string
  /** ARIA label para acessibilidade */
  'aria-label'?: string
}

/**
 * SegmentedControl - Componente de toggle entre dois ou mais valores
 *
 * Características:
 * - Design limpo com buttons conectados
 * - Suporte a ícones + labels
 * - Acessível (ARIA labels)
 * - Completamente customizável
 *
 * Exemplo:
 * ```tsx
 * <SegmentedControl
 *   value={viewMode}
 *   onChange={setViewMode}
 *   options={[
 *     { value: 'table', icon: <List />, label: 'Tabela' },
 *     { value: 'cards', icon: <Grid />, label: 'Cards' }
 *   ]}
 * />
 * ```
 */
export const SegmentedControl = React.forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>(
  (
    {
      value,
      onChange,
      options,
      className,
      'aria-label': ariaLabel = 'Selector',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg bg-muted p-1',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
              'cursor-pointer',
              value === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={option.label}
          >
            {option.icon && (
              <span className="flex items-center justify-center" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    )
  }
)

SegmentedControl.displayName = 'SegmentedControl'
