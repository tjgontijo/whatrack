'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingBannerProps {
  onComplete: () => void
}

export function OnboardingBanner({ onComplete }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 md:p-4 mb-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
      <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5 hidden md:block" />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm md:text-base text-foreground">Complete seu cadastro em 2 minutos</h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Finalize o cadastro da sua empresa para ter acesso a relatórios personalizados,
          análises de funil de vendas e recursos avançados de tracking
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
        <Button
          size="sm"
          onClick={onComplete}
          className="flex-1 md:flex-none bg-warning text-warning-foreground hover:bg-warning/90 text-xs md:text-sm"
        >
          <span className="md:hidden">Completar (2 min)</span>
          <span className="hidden md:inline">Completar cadastro (2 min)</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-warning hover:text-warning/80 p-1 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
