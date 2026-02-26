'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandingVariant } from './types'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
import { useRef } from 'react'

interface Plan {
  name: string
  subtitle: string
  description: string
  price: string
  priceValue: string
  pricePeriod: string
  features: string[]
  cta: string
  highlighted: boolean
}

const plans: Plan[] = [
  {
    name: 'Essencial',
    subtitle: 'Até 500 conversas/mês',
    description: 'Para começar a rastrear suas vendas com clareza.',
    price: 'R$',
    priceValue: '197',
    pricePeriod: '/mês',
    features: [
      'Veja de onde vem cada lead',
      '1 número de WhatsApp conectado',
      'Relatórios de vendas por campanha',
      'Assistente IA que identifica compradores',
    ],
    cta: 'Começar grátis',
    highlighted: false,
  },
  {
    name: 'Profissional',
    subtitle: 'Para agências e times de vendas',
    description: 'Automação completa e múltiplas conexões.',
    price: 'R$',
    priceValue: '297',
    pricePeriod: '/mês',
    features: [
      'Tudo do Essencial',
      'Até 3 números de WhatsApp',
      'Relatórios de ROI em tempo real',
      'Múltiplas contas de anúncio',
      'Dados de venda enviados pro Meta',
    ],
    cta: 'Começar grátis',
    highlighted: true,
  },
  {
    name: 'Operação',
    subtitle: 'Múltiplos clientes ou alto volume',
    description: 'Para quem gerencia operações maiores.',
    price: 'R$',
    priceValue: '497',
    pricePeriod: '/mês',
    features: [
      'Tudo do Profissional',
      'WhatsApp ilimitado',
      'Contas de anúncio ilimitadas',
      'Suporte prioritário via WhatsApp',
      'Integrações personalizadas',
    ],
    cta: 'Começar grátis',
    highlighted: false,
  },
]

interface LandingPricingProps {
  variant?: LandingVariant
}

export function LandingPricing({ variant = 'generic' }: LandingPricingProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const headlines: Record<LandingVariant, { title: string; subtitle: string }> = {
    generic: {
      title: 'Investimento que se paga sozinho',
      subtitle:
        'Comece grátis hoje. Se em 7 dias você não ver claramente de onde vêm suas vendas, cancele com um clique.',
    },
    agencias: {
      title: 'Planos para sua agência',
      subtitle: 'Gerencie múltiplos clientes em um único painel. Teste grátis por 7 dias.',
    },
    lancadores: {
      title: 'Planos para seu lançamento',
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
          className="mb-20 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Planos & Preços
            </span>
          </div>

          <h2 className="mx-auto mb-6 max-w-4xl font-geist text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
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
              className={`group relative overflow-hidden rounded-3xl transition-all ${
                plan.highlighted
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

              <div className="relative p-8 lg:p-10">
                {/* Plan header */}
                <div className="mb-8">
                  <h3 className="mb-2 font-geist text-2xl font-bold">{plan.name}</h3>
                  <p className="mb-1 text-sm font-medium text-zinc-400">{plan.subtitle}</p>
                  <p className="text-sm text-zinc-500">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg text-zinc-400">{plan.price}</span>
                    <span className="font-geist text-5xl font-bold tracking-tight">
                      {plan.priceValue}
                    </span>
                    <span className="text-lg text-zinc-400">{plan.pricePeriod}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  className={`mb-8 h-12 w-full rounded-xl font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40'
                      : 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                  asChild
                >
                  <Link href="/sign-up">{plan.cta}</Link>
                </Button>

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
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                          plan.highlighted
                            ? 'bg-emerald-500/20'
                            : 'bg-zinc-800'
                        }`}
                      >
                        <Check
                          className={`h-3.5 w-3.5 ${
                            plan.highlighted ? 'text-emerald-400' : 'text-zinc-400'
                          }`}
                        />
                      </div>
                      <span className="text-sm leading-relaxed text-zinc-300">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>
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
