'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

const stepLabels = [
  'Conta',
  'Empresa',
  'Negócio',
  'Configurações',
]

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = ((currentStep) / totalSteps) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Passo {currentStep} de {totalSteps}</span>        
      </div>
      
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="hidden sm:flex justify-between">
        {stepLabels.map((label, index) => (
          <div
            key={label}
            className={cn(
              'flex items-center gap-2 text-xs',
              index + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                index + 1 < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index + 1 === currentStep
                  ? 'border-2 border-primary text-primary'
                  : 'border border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {index + 1 < currentStep ? '✓' : index + 1}
            </div>
            <span className="hidden md:inline">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
