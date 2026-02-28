'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { toast } from 'sonner'

interface Plan {
  name: string
  subtitle: string
  description: string
  price: string
  priceValue: string
  pricePeriod: string
  features: string[]
  overage?: {
    metric: string
    price: string
  }
  additionals?: string[]
  highlighted: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    subtitle: 'Até 200 eventos/mês',
    description: 'Para começar a rastrear suas vendas com clareza.',
    price: 'R$',
    priceValue: '97',
    pricePeriod: '/mês',
    features: [
      'Rastreamento de leads e purchases',
      '1 número de WhatsApp',
      '1 conta de anúncio',
      'Relatórios de vendas por campanha',
      'API de Conversão ativada',
    ],
    overage: {
      metric: 'por evento extra',
      price: 'R$ 0,25',
    },
    highlighted: false,
  },
  {
    name: 'Pro',
    subtitle: 'Até 500 eventos/mês',
    description: 'Para agências e operações em escala.',
    price: 'R$',
    priceValue: '197',
    pricePeriod: '/mês',
    features: [
      'Tudo do Starter',
      '2 números de WhatsApp',
      '2 contas de anúncio',
      'Copilot IA avançado',
      'Múltiplos membros da equipe',
      'Relatórios de ROI em tempo real',
    ],
    overage: {
      metric: 'por evento extra',
      price: 'R$ 0,18',
    },
    additionals: ['Números WhatsApp adicionais: R$ 69/mês'],
    highlighted: true,
  },
  {
    name: 'Agency',
    subtitle: 'A partir de 10 WhatsApps',
    description: 'Para agências e operações complexas.',
    price: 'Sob',
    priceValue: 'consulta',
    pricePeriod: '',
    features: [
      'Tudo do Pro com customizações',
      'Múltiplos números de WhatsApp',
      'Contas de anúncio custom',
      'Agentes IA personalizados',
      'Suporte dedicado',
      'SLA garantido',
      'Integrações custom',
    ],
    highlighted: false,
  },
]

type CheckoutState = 'idle' | 'loading' | 'error'

interface PlanSelectorProps {
  onClose?: () => void
}

export function PlanSelector({ onClose }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [state, setState] = useState<CheckoutState>('idle')

  async function handleSelectPlan(planName: string) {
    if (planName === 'Agency') {
      window.location.href = 'mailto:contato@whatrack.com?subject=Plano Agency - WhaTrack'
      return
    }

    setSelectedPlan(planName)
    setState('loading')

    try {
      const response = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: planName.toLowerCase(),
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar checkout')
      }

      const data = await response.json()

      // Redirecionar para o checkout (AbacatePay irá redirecionar)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      setState('error')
      toast.error('Erro ao processar checkout. Tente novamente.')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const isLoading = state === 'loading' && !!selectedPlan
  const isError = state === 'error' && !!selectedPlan

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="font-geist text-2xl font-bold text-white">
          Escolha seu plano
        </h2>
        <p className="mt-2 text-zinc-400">
          Comece grátis por 7 dias. Sem cartão de crédito necessário.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl border transition-all ${
              plan.highlighted
                ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/50 to-zinc-900 ring-2 ring-emerald-500/50'
                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
            }`}
          >
            {/* Glow effect for highlighted plan */}
            {plan.highlighted && (
              <>
                <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute -top-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              </>
            )}

            {/* Badge for highlighted plan */}
            {plan.highlighted && (
              <div className="absolute right-4 top-4">
                <div className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                  Mais escolhido
                </div>
              </div>
            )}

            <div className="relative p-6">
              {/* Plan header */}
              <div className="mb-6">
                <h3 className="font-geist text-xl font-bold text-white">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-zinc-400">
                  {plan.subtitle}
                </p>
                <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                {plan.name === 'Agency' ? (
                  <div className="flex items-baseline gap-1">
                    <span className="font-geist text-2xl font-bold tracking-tight text-emerald-400">
                      {plan.price} {plan.priceValue}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      {plan.price && (
                        <span className="text-lg text-zinc-400">{plan.price}</span>
                      )}
                      <span className="font-geist text-4xl font-bold tracking-tight">
                        {plan.priceValue}
                      </span>
                      {plan.pricePeriod && (
                        <span className="text-lg text-zinc-400">
                          {plan.pricePeriod}
                        </span>
                      )}
                    </div>

                    {/* Overage pricing */}
                    {plan.overage && (
                      <div className="mt-2 text-sm text-zinc-400">
                        <span>
                          {plan.overage.price} {plan.overage.metric}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* CTA Button */}
              <div className="mb-6">
                <Button
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={isLoading}
                  className={`h-11 w-full rounded-lg font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-70'
                      : 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-70'
                  } ${isError && selectedPlan === plan.name ? 'ring-2 ring-red-500/50' : ''}`}
                >
                  {isLoading && selectedPlan === plan.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aguarde...
                    </>
                  ) : isError && selectedPlan === plan.name ? (
                    <>Tentar novamente</>
                  ) : (
                    'Começar agora'
                  )}
                </Button>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                        plan.highlighted
                          ? 'bg-emerald-500/20'
                          : 'bg-zinc-800'
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          plan.highlighted
                            ? 'text-emerald-400'
                            : 'text-zinc-400'
                        }`}
                      />
                    </div>
                    <span className="text-sm leading-relaxed text-zinc-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Adicionais */}
              {plan.additionals && plan.additionals.length > 0 && (
                <div className="mt-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                  {plan.additionals.map((additional, idx) => (
                    <p key={idx} className="text-xs text-zinc-400">
                      <span className="font-medium text-zinc-300">•</span>{' '}
                      {additional}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-500">
          Mais de 500 empresas já rastreiam suas vendas com WhaTrack
        </p>
      </div>
    </div>
  )
}
