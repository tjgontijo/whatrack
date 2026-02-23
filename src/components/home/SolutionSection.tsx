import { CheckCircle2, BarChart3, Zap, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SolutionSection() {
  return (
    <section className="bg-background relative py-24 sm:py-32">
      <div className="bg-primary/5 pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary mx-auto border-transparent px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
          >
            A Solução
          </Badge>
          <h2 className="text-foreground mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Seu novo radar de <span className="text-primary">Vendas e ROI</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg font-medium">
            Conectamos suas contas de anúncios diretamente aos seus atendimentos. O que antes era
            invisível agora é o seu maior diferencial competitivo.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Large Span */}
          <div className="border-border/60 dark:bg-card group relative overflow-hidden rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-lg sm:p-10 lg:col-span-3">
            <div className="bg-primary/5 pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-bl-[100px] transition-transform group-hover:scale-105" />
            <div className="bg-primary text-primary-foreground relative z-10 mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl shadow-md">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-foreground relative z-10 mb-4 text-2xl font-bold">
              Rastreamento e Marcações Precisas
            </h3>
            <p className="text-muted-foreground relative z-10 max-w-md text-base leading-relaxed">
              Acompanhe como os usuários se movem das campanhas do Meta Ads para o WhatsApp. Envie
              marcações de eventos de conversão (CAPI) impecáveis e diminua seu CPA educando muito
              mais o algoritmo.
            </p>
          </div>

          {/* Card 2: Medium Span */}
          <div className="border-border/60 dark:bg-card group relative overflow-hidden rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-lg sm:p-10 lg:col-span-2">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-purple-200 bg-purple-100 text-purple-600 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="text-foreground mb-4 text-xl font-bold">Aqueça o Meta Ads com CAPI</h3>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              Com a nossa Conversão Offline (CAPI), enviamos de volta para o Meta exatamente quem
              comprou. Suas campanhas ficam brutalmente mais inteligentes.
            </p>
          </div>

          {/* Card 3: Medium Span */}
          <div className="border-border/60 dark:bg-card group relative overflow-hidden rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-lg sm:p-10 lg:col-span-2">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h3 className="text-foreground mb-4 text-xl font-bold">
              ROI por Campanha em Tempo Real
            </h3>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              Descubra na hora qual canal traz o melhor lead. Saiba qual ad queima dinheiro e qual
              dobra seu faturamento com relatórios de performance ao vivo.
            </p>
          </div>

          {/* Card 4: Large Span */}
          <div className="border-border/60 dark:bg-card group relative overflow-hidden rounded-2xl border bg-white p-8 shadow-sm transition hover:shadow-lg sm:p-10 lg:col-span-3">
            <div className="pointer-events-none absolute bottom-0 right-0 h-1/2 w-full bg-gradient-to-t from-emerald-500/5 to-transparent" />
            <div className="relative z-10 mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Shield className="h-7 w-7" />
            </div>
            <h3 className="text-foreground relative z-10 mb-4 text-2xl font-bold">
              Copilot de IA Lendo o Jogo
            </h3>
            <p className="text-muted-foreground relative z-10 max-w-md text-base leading-relaxed">
              Enquanto o seu time ou sistema atende pelo WhatsApp, nosso Copilot acompanha as
              conversas silenciosamente de fundo, avaliando padrões e classificando conexões
              valiosas (Lead Qualificado, Venda) sem trabalho braçal.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
