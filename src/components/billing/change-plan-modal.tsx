'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Plan {
  id: string
  name: string
  description: string | null
  isActive: boolean
  prices: {
    id: string
    amountCents: number
    currency: string
    interval: 'monthly' | 'yearly'
  }[]
  limits: {
    maxMetaProfiles: number
    maxMetaAdAccounts: number
    maxWhatsappInstances: number
    maxMembers: number
  }
}

interface ChangePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId: string
  currentInterval: 'monthly' | 'yearly'
}

function formatCurrency(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

export function ChangePlanModal({
  open,
  onOpenChange,
  currentPlanId,
  currentInterval,
}: ChangePlanModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>(currentInterval)
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  const { data: plans, isLoading: isLoadingPlans } = useQuery<Plan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const response = await fetch('/api/v1/billing/plans')
      if (!response.ok) {
        throw new Error('Erro ao carregar planos')
      }
      const data = await response.json()
      return data.plans ?? []
    },
    enabled: open,
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ planId, interval }: { planId: string; interval?: 'monthly' | 'yearly' }) => {
      const response = await fetch('/api/v1/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao alterar plano')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['organization-limits'] })
      onOpenChange(false)
      setStep('select')
      setSelectedPlanId(null)
    },
  })

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId)
  const currentPlan = plans?.find((p) => p.id === currentPlanId)
  const selectedPrice = selectedPlan?.prices.find((p) => p.interval === selectedInterval)
  const currentPrice = currentPlan?.prices.find((p) => p.interval === currentInterval)

  const isUpgrade = selectedPrice && currentPrice
    ? selectedPrice.amountCents > currentPrice.amountCents
    : false

  const handleClose = () => {
    onOpenChange(false)
    setStep('select')
    setSelectedPlanId(null)
  }

  const handleContinue = () => {
    if (selectedPlanId) {
      setStep('confirm')
    }
  }

  const handleConfirm = () => {
    if (selectedPlanId) {
      changePlanMutation.mutate({
        planId: selectedPlanId,
        interval: selectedInterval !== currentInterval ? selectedInterval : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Alterar Plano</DialogTitle>
              <DialogDescription>
                Escolha o novo plano para sua organização
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Interval toggle */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={selectedInterval === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedInterval('monthly')}
                >
                  Mensal
                </Button>
                <Button
                  variant={selectedInterval === 'yearly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedInterval('yearly')}
                >
                  Anual
                  <Badge variant="secondary" className="ml-2">-20%</Badge>
                </Button>
              </div>

              {/* Plans list */}
              {isLoadingPlans ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <RadioGroup
                  value={selectedPlanId ?? ''}
                  onValueChange={setSelectedPlanId}
                  className="space-y-3"
                >
                  {plans?.filter((p) => p.isActive).map((plan) => {
                    const price = plan.prices.find((p) => p.interval === selectedInterval)
                    const isCurrent = plan.id === currentPlanId && selectedInterval === currentInterval

                    return (
                      <label
                        key={plan.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors',
                          selectedPlanId === plan.id && 'border-primary bg-primary/5',
                          isCurrent && 'border-muted bg-muted/50 cursor-not-allowed opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <RadioGroupItem
                            value={plan.id}
                            id={plan.id}
                            disabled={isCurrent}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={plan.id}
                                className={cn('text-base font-medium', isCurrent && 'cursor-not-allowed')}
                              >
                                {plan.name}
                              </Label>
                              {isCurrent && (
                                <Badge variant="outline">Plano atual</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {plan.description}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{plan.limits.maxWhatsappInstances} WhatsApp</span>
                              <span>{plan.limits.maxMembers} membros</span>
                              <span>{plan.limits.maxMetaProfiles} perfis Meta</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {price ? formatCurrency(price.amountCents, price.currency) : '-'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            /{selectedInterval === 'monthly' ? 'mês' : 'ano'}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </RadioGroup>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleContinue} disabled={!selectedPlanId}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Alteração</DialogTitle>
              <DialogDescription>
                Revise as alterações antes de confirmar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">De</p>
                    <p className="font-medium">{currentPlan?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentPrice ? formatCurrency(currentPrice.amountCents) : '-'}/{currentInterval === 'monthly' ? 'mês' : 'ano'}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Para</p>
                    <p className="font-medium">{selectedPlan?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPrice ? formatCurrency(selectedPrice.amountCents) : '-'}/{selectedInterval === 'monthly' ? 'mês' : 'ano'}
                    </p>
                  </div>
                </div>
              </div>

              {isUpgrade ? (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                  <Check className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Upgrade de Plano</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Você terá acesso imediato aos novos recursos. O valor proporcional será cobrado na próxima fatura.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">Downgrade de Plano</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      A alteração será aplicada imediatamente. Você receberá crédito proporcional ao período não utilizado.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={changePlanMutation.isPending}
              >
                {changePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Confirmar Alteração'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
