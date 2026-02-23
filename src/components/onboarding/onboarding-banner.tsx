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
    <div className="bg-warning/10 border-warning/30 mb-4 flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-start md:gap-4 md:p-4">
      <AlertTriangle className="text-warning mt-0.5 hidden h-5 w-5 flex-shrink-0 md:block" />

      <div className="min-w-0 flex-1">
        <h3 className="text-foreground text-sm font-semibold md:text-base">
          Complete seu cadastro em 2 minutos
        </h3>
        <p className="text-muted-foreground mt-1 text-xs md:text-sm">
          Finalize o cadastro da sua empresa para ter acesso a relatórios personalizados, análises
          de funil de vendas e recursos avançados de tracking
        </p>
      </div>

      <div className="flex w-full flex-shrink-0 items-center gap-2 md:w-auto">
        <Button
          size="sm"
          onClick={onComplete}
          className="bg-warning text-warning-foreground hover:bg-warning/90 flex-1 text-xs md:flex-none md:text-sm"
        >
          <span className="md:hidden">Completar (2 min)</span>
          <span className="hidden md:inline">Completar cadastro (2 min)</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-warning hover:text-warning/80 flex-shrink-0 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
