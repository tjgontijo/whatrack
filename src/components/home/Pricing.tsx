import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const plans = [
  {
    name: 'Starter',
    subtitle: 'Para quem está começando',
    description: 'Ideal para pequenas operações e lançamentos iniciais.',
    price: 'R$',
    priceValue: '197',
    pricePeriod: '/mês',
    features: [
      'Copilot IA Analítico',
      '1 Conexão de WhatsApp',
      'Sincronização de Meta Ads',
      'Envio de Eventos (CAPI)',
    ],
    cta: 'Começar Teste Grátis',
    highlighted: false,
  },
  {
    name: 'Growth',
    subtitle: 'Para agências e lançadores',
    description: 'Automação completa para times em crescimento.',
    price: 'R$',
    priceValue: '297',
    pricePeriod: '/mês',
    features: [
      'Tudo do Starter',
      'Até 3 Conexões de WhatsApp',
      'Sincronização completa de Meta Ads',
      'Automações e Respostas Rápidas',
      'Relatórios de ROI em tempo real',
    ],
    cta: 'Testar por 7 Dias',
    highlighted: true,
  },
  {
    name: 'Pro Scale',
    subtitle: 'Para grandes operações',
    description: 'Volume intensivo, dezenas de contas e integrações.',
    price: 'R$',
    priceValue: '497',
    pricePeriod: '/mês',
    features: [
      'Tudo do Growth',
      'Conexões ilimitadas de WhatsApp',
      'Sync focado em Conversão Offline (CAPI)',
      'Webhooks e integrações avançadas',
      'Suporte prioritário via WhatsApp',
    ],
    cta: 'Experimentar Agora',
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section
      id="pricing"
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
            Escale sua operação com clareza
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Escolha o plano ideal e teste a ferramenta por{' '}
            <strong className="text-foreground">7 dias grátis</strong> sem compromisso. Cancele
            quando quiser.
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
                  <Badge className="bg-primary text-primary-foreground">Mais popular</Badge>
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
                className={`h-12 w-full text-sm font-semibold tracking-wide ${plan.highlighted ? 'shadow-primary/30 shadow-lg transition-transform hover:-translate-y-0.5' : ''}`}
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
