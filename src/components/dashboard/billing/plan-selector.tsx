'use client'

import { useState } from 'react'
import { Check, Loader2, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/utils'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'
import { BILLING_PLANS, BILLING_PLAN_ORDER, type BillingPlan } from '@/lib/billing/plans'

const PLANS = BILLING_PLAN_ORDER.map((planType) => BILLING_PLANS[planType])

type CheckoutState = 'idle' | 'loading' | 'error'

interface PlanSelectorProps {
  onClose?: () => void
  redirectPath?: string
  showHeader?: boolean
}

export function PlanSelector({
  onClose: _,
  redirectPath = '/dashboard/billing',
  showHeader = true,
}: PlanSelectorProps) {
  const { data: org } = useOrganization()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [state, setState] = useState<CheckoutState>('idle')

  async function handleSelectPlan(plan: BillingPlan) {
    if (plan.contactSalesOnly) {
      window.location.href =
        'mailto:contato@whatrack.com?subject=Plano Agency - WhaTrack'
      return
    }

    setSelectedPlan(plan.id)
    setState('loading')

    try {
      if (!org?.id) {
        toast.error('Selecione uma organização primeiro')
        setState('idle')
        return
      }

      const data = await apiFetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType: plan.id, redirectPath }),
        orgId: org.id,
      })

      if ((data as any).url) {
        window.location.href = (data as any).url
      }
    } catch (error) {
      setState('error')
      toast.error('Erro ao processar checkout. Tente novamente.')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      {showHeader && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Escolha seu plano
          </h2>
        </div>
      )}

      {/* Cards de plano */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan, index) => {
          const isLoadingThis = state === 'loading' && selectedPlan === plan.id
          const isErrorThis = state === 'error' && selectedPlan === plan.id

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.07 }}
              className={cn(
                'relative flex flex-col overflow-hidden rounded-xl border transition-all',
                plan.highlighted
                  ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card hover:border-border/80',
              )}
            >
              {/* Linha de destaque no topo */}
              {plan.highlighted && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
              )}

              <div className="flex flex-1 flex-col p-5">
                {/* Cabeçalho do plano */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {plan.name}
                    </h3>
                    {plan.highlighted && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {plan.subtitle}
                  </p>
                </div>

                {/* Preço */}
                <div className="mb-4">
                  {plan.pricePrefix !== null ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">
                          {plan.pricePrefix}
                        </span>
                        <span className="text-2xl font-bold text-foreground">
                          {plan.priceValue}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /mês
                        </span>
                      </div>
                      {plan.overageLabel && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          + {plan.overageLabel}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-lg font-semibold text-primary">
                      {plan.priceValue}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={state === 'loading'}
                  size="sm"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  className={cn(
                    'mb-4 w-full',
                    plan.highlighted &&
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {isLoadingThis ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Aguarde...
                    </>
                  ) : isErrorThis ? (
                    'Tentar novamente'
                  ) : plan.contactSalesOnly ? (
                    <>
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      Falar com vendas
                    </>
                  ) : (
                    <>
                      Assinar {plan.name}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>

                {/* Divisor */}
                <div className="mb-4 h-px bg-border" />

                {/* Features */}
                <ul className="flex flex-1 flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                          plan.highlighted
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Adicionais */}
                {plan.additionals.length > 0 && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    {plan.additionals.map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        + {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
