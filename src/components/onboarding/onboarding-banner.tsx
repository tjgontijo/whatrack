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
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4 flex items-start gap-4">
      <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">Complete seu cadastro</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione informações sobre sua empresa para desbloquear recursos avançados
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={onComplete}
          className="bg-warning text-warning-foreground hover:bg-warning/90"
        >
          Completar agora
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-warning hover:text-warning/80 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
