'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BillingCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
}

export function BillingCancelDialog({
  open,
  onOpenChange,
  planName,
}: BillingCancelDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cancelOption, setCancelOption] = useState<'period-end' | 'immediate'>('period-end')

  async function handleCancel() {
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atPeriodEnd: cancelOption === 'period-end',
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura')
      }

      toast.success('Assinatura cancelada com sucesso')
      onOpenChange(false)

      // Reload billing status
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao cancelar assinatura'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-zinc-800 bg-zinc-900">
        <AlertDialogTitle className="text-white">Cancelar assinatura</AlertDialogTitle>

        <AlertDialogDescription className="space-y-4">
          <p className="text-zinc-300">
            Ao cancelar, você perderá acesso ao plano <span className="font-semibold">{planName}</span>.
            Eventos já registrados neste ciclo não serão reembolsados.
          </p>

          {/* Cancel options */}
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-colors hover:bg-zinc-800">
              <input
                type="radio"
                name="cancel-option"
                value="period-end"
                checked={cancelOption === 'period-end'}
                onChange={() => setCancelOption('period-end')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-white">Cancelar no fim do período</div>
                <div className="text-xs text-zinc-400">
                  Você continuará tendo acesso até a data de renovação
                </div>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 transition-colors hover:bg-zinc-800">
              <input
                type="radio"
                name="cancel-option"
                value="immediate"
                checked={cancelOption === 'immediate'}
                onChange={() => setCancelOption('immediate')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-white">Cancelar agora</div>
                <div className="text-xs text-zinc-400">
                  O acesso será encerrado imediatamente
                </div>
              </div>
            </label>
          </div>
        </AlertDialogDescription>

        <div className="flex gap-3">
          <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700">
            Manter assinatura
          </AlertDialogCancel>

          <Button
            onClick={handleCancel}
            disabled={isLoading}
            className="bg-red-600 text-white hover:bg-red-700"
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
