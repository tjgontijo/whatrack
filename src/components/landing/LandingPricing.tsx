import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LandingVariant } from './types'

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
  // Customize headline based on variant
  const headlines: Record<LandingVariant, { title: string; subtitle: string }> = {
    generic: {
      title: 'Escolha seu plano e teste por 7 dias',
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
      className="from-background to-card relative bg-gradient-to-b py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary mx-auto px-3 py-1 text-xs font-bold uppercase tracking-wider"
          >
            Planos & Preços
          </Badge>
          <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
            {headline.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            {headline.subtitle}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 lg:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition ${
                plan.highlighted
                  ? 'border-primary from-primary/10 to-card ring-primary/20 bg-gradient-to-br shadow-xl ring-1'
                  : 'border-border bg-card shadow-sm hover:shadow-md'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Mais escolhido</Badge>
                </div>
              )}

              <div className="mb-6 space-y-2">
                <h3 className="text-foreground text-2xl font-bold">{plan.name}</h3>
                <p className="text-muted-foreground text-sm font-medium">{plan.subtitle}</p>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-6 space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground text-sm">{plan.price}</span>
                  <span className="text-foreground text-3xl font-bold">{plan.priceValue}</span>
                  <span className="text-muted-foreground text-sm">{plan.pricePeriod}</span>
                </div>
              </div>

              <div className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={`h-12 w-full text-sm font-semibold tracking-wide ${
                  plan.highlighted
                    ? 'shadow-primary/30 shadow-lg transition-transform hover:-translate-y-0.5'
                    : ''
                }`}
                variant={plan.highlighted ? 'default' : 'outline'}
                asChild
              >
                <Link href="/auth/sign-up">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
