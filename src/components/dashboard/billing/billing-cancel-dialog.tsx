'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


interface BillingCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
}

const CANCEL_OPTIONS = [
  {
    value: 'period-end' as const,
    label: 'Encerrar no fim do período',
    description: 'A Stripe mantém o acesso ativo até a data de renovação atual.',
  },
  {
    value: 'immediate' as const,
    label: 'Encerrar acesso agora',
    description: 'A assinatura será encerrada imediatamente no provider e no Whatrack.',
  },
]

export function BillingCancelDialog({
  open,
  onOpenChange,
  planName,
}: BillingCancelDialogProps) {
  const router = useRouter()
  const { data: org } = useOrganization()
  const orgId = org?.id
  const [isLoading, setIsLoading] = useState(false)
  const [cancelOption, setCancelOption] = useState<'period-end' | 'immediate'>(
    'period-end',
  )

  async function handleCancel() {
    setIsLoading(true)

    try {
      if (!orgId) throw new Error('Organização não identificada')

      await apiFetch('/api/v1/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ atPeriodEnd: cancelOption === 'period-end' }),
        orgId,
      })

      toast.success(
        cancelOption === 'period-end'
          ? 'Cancelamento agendado para o fim do período atual'
          : 'Acesso ao plano encerrado no Whatrack'
      )
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao cancelar assinatura',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogTitle className="text-foreground">
          Cancelar assinatura
        </AlertDialogTitle>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O cancelamento reflete o estado real da assinatura na Stripe. Ao encerrar, você perderá acesso ao plano{' '}
            <span className="font-medium text-foreground">{planName}</span>.
            Eventos registrados neste ciclo não serão reembolsados.
          </p>

          {/* Opções de cancelamento */}
          <div className="space-y-2">
            {CANCEL_OPTIONS.map((option) => {
              const selected = cancelOption === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCancelOption(option.value)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                    selected
                      ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-muted/30 hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Radio visual */}
                    <div
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        selected
                          ? 'border-primary bg-primary'
                          : 'border-border bg-transparent',
                      )}
                    >
                      {selected && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {option.label}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          <AlertDialogCancel className="flex-1">
            Manter assinatura
          </AlertDialogCancel>

          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="destructive"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              'Confirmar cancelamento'
            )}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
