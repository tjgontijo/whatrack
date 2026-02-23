import { Plug, Database, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const steps = [
  {
    number: '01',
    icon: Plug,
    title: 'Conecte seu Meta Ads e WhatsApp',
    description:
      'Integração feita em 2 minutos via QR Code e Login Seguro. Sem códigos complexos, sem suporte técnico demorado.',
  },
  {
    number: '02',
    icon: Database,
    title: 'Copilot Monitora o Funil',
    description:
      'Nossos Agentes Copilot de IA leem as conversas do WhatsApp em tempo real, sempre cruzando as conversões com o Meta Ads originais.',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Retroalimente a Meta (CAPI)',
    description:
      'O Whatrack devolve marcações perfeitas do comprador para a API de Conversões. O Meta Ads aprende e reduz o seu custo por venda diariamente.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how"
      className="dark:bg-muted/10 border-border/50 border-y bg-[#f8f9fa] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary mx-auto border-transparent px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
          >
            Como Funciona
          </Badge>
          <h2 className="text-foreground mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Visibilidade total em <span className="text-primary">3 passos simples</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg font-medium">
            Em menos de 10 minutos você implementa o Whatrack sem depender da equipe de TI e já
            enxerga os dados reais.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="group relative">
                {/* Connector line on desktop */}
                {index < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-12 hidden w-full translate-x-1/2 items-center lg:flex">
                    <div className="from-border h-px w-full bg-gradient-to-r to-transparent" />
                  </div>
                )}

                <div className="dark:bg-card border-border/60 relative z-10 flex h-full flex-col items-start rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
                  <div className="mb-6 flex w-full items-center justify-between">
                    <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition-transform group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-muted/30 select-none text-5xl font-black">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-foreground mb-3 text-xl font-bold leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
