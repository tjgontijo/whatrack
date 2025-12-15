'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface CancelSubscriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
  currentPeriodEnd: string | null
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function CancelSubscriptionModal({
  open,
  onOpenChange,
  planName,
  currentPeriodEnd,
}: CancelSubscriptionModalProps) {
  const queryClient = useQueryClient()
  const [cancelType, setCancelType] = useState<'end_of_period' | 'immediate'>('end_of_period')
  const [step, setStep] = useState<'options' | 'confirm'>('options')

  const cancelMutation = useMutation({
    mutationFn: async (immediate: boolean) => {
      const response = await fetch('/api/v1/billing/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao cancelar assinatura')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['organization-limits'] })
      onOpenChange(false)
      setStep('options')
      setCancelType('end_of_period')
    },
  })

  const handleClose = () => {
    onOpenChange(false)
    setStep('options')
    setCancelType('end_of_period')
  }

  const handleConfirm = () => {
    cancelMutation.mutate(cancelType === 'immediate')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'options' ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">Cancelar Assinatura</DialogTitle>
              <DialogDescription className="text-center">
                Você está prestes a cancelar o plano <strong>{planName}</strong>.
                Escolha como deseja prosseguir.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <RadioGroup
                value={cancelType}
                onValueChange={(v) => setCancelType(v as 'end_of_period' | 'immediate')}
                className="space-y-3"
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <RadioGroupItem value="end_of_period" id="end_of_period" className="mt-1" />
                  <div>
                    <Label htmlFor="end_of_period" className="cursor-pointer font-medium">
                      Cancelar ao final do período
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Você continuará tendo acesso até{' '}
                      {currentPeriodEnd ? formatDate(currentPeriodEnd) : 'o fim do período atual'}.
                      Poderá reativar a qualquer momento antes dessa data.
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
                  <div>
                    <Label htmlFor="immediate" className="cursor-pointer font-medium">
                      Cancelar imediatamente
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      O acesso será removido agora. Não será possível reativar esta assinatura.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setStep('confirm')}
              >
                Continuar
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full"
              >
                Manter meu plano
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">Confirmar Cancelamento</DialogTitle>
              <DialogDescription className="text-center">
                {cancelType === 'immediate' ? (
                  <>
                    <strong>Atenção:</strong> Esta ação é irreversível. Você perderá o acesso
                    imediatamente e não será possível recuperar os dados associados ao plano.
                  </>
                ) : (
                  <>
                    Sua assinatura será cancelada em{' '}
                    <strong>{currentPeriodEnd ? formatDate(currentPeriodEnd) : 'breve'}</strong>.
                    Você poderá continuar usando o serviço até essa data.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm font-medium">
                  {cancelType === 'immediate'
                    ? 'Cancelamento imediato'
                    : 'Cancelamento ao final do período'}
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {planName}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleConfirm}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('options')}
                className="w-full"
                disabled={cancelMutation.isPending}
              >
                Voltar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
