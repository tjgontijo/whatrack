'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuizStepProps {
  question: string
  description?: string
  children: ReactNode
  onNext?: () => void
  onBack?: () => void
  showBack?: boolean
  nextLabel?: string
  isSubmit?: boolean
  isLoading?: boolean
  canProceed?: boolean
}

export function QuizStep({
  question,
  description,
  children,
  onNext,
  onBack,
  showBack = true,
  nextLabel = 'Continuar',
  isSubmit = false,
  isLoading = false,
  canProceed = true,
}: QuizStepProps) {
  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* Botão voltar */}
      {showBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 self-start"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      )}

      {/* Pergunta */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{question}</h2>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Conteúdo (opções, inputs, etc) */}
          <div className="py-4">
            {children}
          </div>
        </div>
      </div>

      {/* Botão próximo */}
      {onNext && (
        <div className="pt-8">
          <Button
            type={isSubmit ? 'submit' : 'button'}
            onClick={isSubmit ? undefined : onNext}
            disabled={!canProceed || isLoading}
            className="w-full h-12"
          >
            {isLoading ? 'Aguarde...' : nextLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

interface QuizOptionProps {
  label: string
  selected: boolean
  onClick: () => void
  description?: string
}

export function QuizOption({ label, selected, onClick, description }: QuizOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      )}
    >
      <span className={cn('font-medium', selected && 'text-primary')}>{label}</span>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </button>
  )
}

interface QuizOptionGridProps {
  children: ReactNode
  columns?: 2 | 3
}

export function QuizOptionGrid({ children, columns = 2 }: QuizOptionGridProps) {
  return (
    <div className={cn(
      'grid gap-3',
      columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
    )}>
      {children}
    </div>
  )
}

export function QuizOptionChip({ label, selected, onClick }: Omit<QuizOptionProps, 'description'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full border-2 text-sm font-medium transition-all',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:border-primary/50'
      )}
    >
      {label}
    </button>
  )
}
