import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const highlights = [
  'Rastreie leads, agendamentos e vendas em um painel',
  'Saiba exatamente o Custo de Aquisição (CPA) real',
  'Integração instantânea com a API do Meta Ads',
]

export function Hero() {
  return (
    <section className="bg-background text-foreground relative overflow-hidden pb-20 pt-32 lg:pb-32 lg:pt-48">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/10 absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 text-center sm:px-8">
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary border-primary/20 mb-8 w-fit px-4 py-1.5 text-sm font-semibold uppercase tracking-widest"
        >
          O Fim do achismo nas vendas
        </Badge>

        <h1 className="text-foreground max-w-4xl text-5xl font-extrabold !leading-[1.1] tracking-tight sm:text-6xl xl:text-7xl">
          Pare de perder conversões. Rastreie{' '}
          <span className="text-primary">cada lead e venda</span> num só lugar.
        </h1>

        <p className="text-muted-foreground mt-8 max-w-3xl text-xl leading-relaxed sm:text-2xl">
          Nossa Inteligência Artificial acompanha seus atendimentos no WhatsApp, descobre quem
          comprou e{' '}
          <span className="text-foreground font-semibold">
            devolve a conversão (CAPI) para marcar o Meta Ads
          </span>{' '}
          em tempo real.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col justify-center gap-4 sm:max-w-none sm:flex-row sm:gap-6">
          <Button
            size="lg"
            className="shadow-primary/20 hover:shadow-primary/40 h-14 px-8 text-lg font-bold shadow-xl transition-all hover:-translate-y-1"
            asChild
          >
            <Link href="/auth/sign-up">
              Comece seus 7 Dias Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 border-2 px-8 text-lg font-bold"
            asChild
          >
            <Link href="#pricing">Ver Planos e Preços</Link>
          </Button>
        </div>

        <div className="text-muted-foreground mt-12 flex flex-col items-center gap-6 text-sm font-medium sm:flex-row">
          {highlights.map((highlight) => (
            <div key={highlight} className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        {/* Hero Mockup or Abstract Dashboard preview */}
        <div className="relative mt-20 w-full">
          <div className="from-primary/30 absolute -inset-1 rounded-2xl bg-gradient-to-b to-transparent blur-lg" />
          <div className="border-border/50 bg-card relative flex flex-col overflow-hidden rounded-2xl border shadow-2xl">
            <div className="border-border/50 bg-muted/30 flex h-12 items-center gap-2 border-b px-4">
              <div className="bg-destructive/80 h-3 w-3 rounded-full" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="from-background to-muted/20 flex h-[300px] w-full items-center justify-center bg-gradient-to-br p-8 sm:h-[400px]">
              {/* Abstract placeholder for the dashboard map/funnel */}
              <div className="grid h-full w-full max-w-4xl grid-cols-1 gap-6 opacity-80 md:grid-cols-3">
                <div className="bg-card border-border/40 flex h-full flex-col gap-4 rounded-xl border p-6 shadow-sm">
                  <div className="bg-muted h-4 w-1/3 rounded-full" />
                  <div className="flex h-8 w-2/3 items-center rounded-md bg-emerald-500/10 px-3 font-mono font-bold text-emerald-600">
                    R$ 14.500
                  </div>
                  <div className="border-border flex flex-1 items-end gap-2 rounded-lg border border-dashed p-2">
                    <div className="bg-primary/20 h-1/3 w-full rounded-sm" />
                    <div className="bg-primary/40 h-2/3 w-full rounded-sm" />
                    <div className="bg-primary h-full w-full rounded-sm shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                  </div>
                </div>
                <div className="bg-card border-border/40 hidden h-full flex-col gap-4 rounded-xl border p-6 shadow-sm md:flex">
                  <div className="bg-muted h-4 w-1/2 rounded-full" />
                  <div className="mt-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="bg-muted h-8 w-8 shrink-0 rounded-full" />
                        <div className="bg-muted/50 h-3 flex-1 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border-border/40 hidden h-full flex-col gap-4 rounded-xl border p-6 shadow-sm md:flex">
                  <div className="bg-muted h-4 w-1/3 rounded-full" />
                  <div className="flex h-full items-center justify-center">
                    <div className="relative h-32 w-32">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="stroke-muted fill-none stroke-[8] opacity-20"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          className="stroke-primary fill-none stroke-[8]"
                          strokeDasharray="251"
                          strokeDashoffset="60"
                        />
                      </svg>
                      <div className="text-foreground absolute inset-0 flex items-center justify-center text-2xl font-bold">
                        76%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
