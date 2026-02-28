'use client'

import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingVariant } from './types'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef, useState } from 'react'
import { useSession } from '@/lib/auth/auth-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useOrganization } from '@/hooks/organization/use-organization'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'

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
  cta: string
  highlighted: boolean
}

const plans: Plan[] = [
  {
    name: 'Starter',
    subtitle: 'Até 100 eventos/mês',
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
    cta: 'Começar agora',
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
    cta: 'Começar agora',
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
    cta: 'Falar com time',
    highlighted: false,
  },
]

interface LandingPricingProps {
  variant?: LandingVariant
}

type CheckoutState = 'idle' | 'loading' | 'error'

interface CheckoutButtonProps {
  plan: Plan
}

function CheckoutButton({ plan }: CheckoutButtonProps) {
  const [state, setState] = useState<CheckoutState>('idle')
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const { data: session } = useSession()
  const { data: org } = useOrganization()
  const router = useRouter()

  async function handleCheckout() {
    // Não autenticado — mostrar diálogo de autenticação
    if (!session?.user) {
      setShowAuthDialog(true)
      return
    }

    // Sem organização ativa
    if (!org?.id) {
      toast.error('Selecione uma organização antes de continuar')
      return
    }

    // Agency plan — abrir contato
    if (plan.name === 'Agency') {
      window.location.href = 'mailto:contato@whatrack.com?subject=Plano Agency - WhaTrack'
      return
    }

    setState('loading')

    try {
      // Fazer requisição para criar checkout
      const response = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: org.id,
        },
        body: JSON.stringify({
          planType: plan.name.toLowerCase(),
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

  function handleSignIn() {
    setShowAuthDialog(false)
    router.push(`/sign-in?next=${encodeURIComponent('/dashboard/billing')}`)
  }

  function handleSignUp() {
    setShowAuthDialog(false)
    router.push(`/sign-up?next=${encodeURIComponent('/dashboard/billing')}`)
  }

  const isLoading = state === 'loading'
  const isError = state === 'error'

  return (
    <>
      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className={`h-12 w-full rounded-xl font-semibold transition-all ${plan.highlighted
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-70'
            : 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-70'
          } ${isError ? 'ring-2 ring-red-500/50' : ''}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Aguarde...
          </>
        ) : isError ? (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Tentar novamente
          </>
        ) : (
          plan.cta
        )}
      </Button>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent showCloseButton className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assinar plano {plan.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Escolha como você deseja continuar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              onClick={handleSignIn}
              variant="outline"
              className="h-11 w-full border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
            >
              Entrar na minha conta
            </Button>

            <Button
              onClick={handleSignUp}
              className="h-11 w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700"
            >
              Criar uma conta
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-500">
            Você será direcionado para selecionar seu plano após o login ou registro.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function LandingPricing({ variant = 'generic' }: LandingPricingProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const headlines: Record<LandingVariant, { title: string; subtitle: string }> = {
    generic: {
      title: 'Se paga na primeira venda que você consegue rastrear.',
      subtitle:
        'Comece grátis por 7 dias. Veja o resultado antes de decidir. Sem fidelidade, cancele quando quiser.',
    },
    agencias: {
      title: 'Basic',
      subtitle: 'Gerencie múltiplos clientes em um único painel. Teste grátis por 7 dias.',
    },
    lancadores: {
      title: 'Business',
      subtitle: 'ROI em tempo real durante o carrinho aberto. Teste grátis por 7 dias.',
    },
    empresas: {
      title: 'Planos para sua empresa',
      subtitle: 'Simples de usar, sem complicação. Teste grátis por 7 dias.',
    },
  }

  const headline = headlines[variant]

  return (
    <section
      id="planos"
      ref={ref}
      className="relative overflow-hidden bg-zinc-950 py-32 text-white"
    >
      {/* Sophisticated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute right-0 top-1/2 h-full w-1/3 -translate-y-1/2 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent" />

        {/* Grid pattern */}
        <svg className="h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="pricing-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-zinc-800"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pricing-grid)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center sm:mb-20"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Planos & Preços
            </span>
          </div>

          <h2 className="mx-auto mb-6 max-w-4xl font-geist text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {headline.title}
          </h2>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-400">
            {headline.subtitle}
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 0.2 + i * 0.1,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`group relative overflow-hidden rounded-3xl transition-all ${plan.highlighted
                ? 'bg-gradient-to-b from-emerald-950/50 to-zinc-900 ring-2 ring-emerald-500/50'
                : 'bg-zinc-900/50 ring-1 ring-zinc-800 hover:ring-zinc-700'
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
                <div className="absolute right-6 top-6">
                  <div className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                    Mais escolhido
                  </div>
                </div>
              )}

              <div className="relative p-6 sm:p-8 lg:p-10">
                {/* Plan header */}
                <div className="mb-8">
                  <h3 className="mb-2 font-geist text-2xl font-bold">{plan.name}</h3>
                  <p className="mb-1 text-sm font-medium text-zinc-400">{plan.subtitle}</p>
                  <p className="text-sm text-zinc-500">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="mb-8">
                  {plan.name === 'Agency' ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-geist text-3xl font-bold tracking-tight text-emerald-400">
                        {plan.price} {plan.priceValue}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        {plan.price && <span className="text-lg text-zinc-400">{plan.price}</span>}
                        <span className="font-geist text-5xl font-bold tracking-tight">
                          {plan.priceValue}
                        </span>
                        {plan.pricePeriod && <span className="text-lg text-zinc-400">{plan.pricePeriod}</span>}
                      </div>

                      {/* Overage pricing */}
                      {plan.overage && (
                        <div className="mt-3 text-sm text-zinc-400">
                          <span>{plan.overage.price} {plan.overage.metric}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CTA Button */}
                <div className="mb-8">
                  <CheckoutButton plan={plan} />
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <div className="mb-4 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                  {plan.features.map((feature, idx) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{
                        delay: 0.4 + i * 0.1 + idx * 0.05,
                        duration: 0.5,
                      }}
                      className="flex items-start gap-3"
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${plan.highlighted
                          ? 'bg-emerald-500/20'
                          : 'bg-zinc-800'
                          }`}
                      >
                        <Check
                          className={`h-3.5 w-3.5 ${plan.highlighted ? 'text-emerald-400' : 'text-zinc-400'
                            }`}
                        />
                      </div>
                      <span className="text-sm leading-relaxed text-zinc-300">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Adicionais */}
                {plan.additionals && plan.additionals.length > 0 && (
                  <div className="mt-6 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    {plan.additionals.map((additional, idx) => (
                      <p key={idx} className="text-xs text-zinc-400">
                        <span className="font-medium text-zinc-300">•</span> {additional}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-zinc-500">
            Mais de 500 empresas já rastreiam suas vendas com WhaTrack
          </p>
        </motion.div>
      </div>
    </section>
  )
}
