import { CheckCircle2, BarChart3, Zap, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SolutionSection() {
  return (
    <section className="relative bg-background py-24 sm:py-32">
      <div className="absolute inset-0 bg-primary/5 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge variant="secondary" className="mx-auto bg-primary/10 text-primary border-transparent px-4 py-1.5 uppercase tracking-widest text-xs font-bold">
            A Solução
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight max-w-2xl mx-auto">
            Seu novo radar de <span className="text-primary">Vendas e ROI</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground font-medium mt-4">
            Conectamos suas contas de anúncios diretamente aos seus atendimentos. O que antes era invisível agora é o seu maior diferencial competitivo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-12">
          {/* Card 1: Large Span */}
          <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-white dark:bg-card p-8 sm:p-10 shadow-sm transition hover:shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-[100px] pointer-events-none transition-transform group-hover:scale-105" />
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md relative z-10">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-foreground relative z-10">Rastreamento e Marcações Precisas</h3>
            <p className="text-muted-foreground text-base leading-relaxed relative z-10 max-w-md">
              Acompanhe como os usuários se movem das campanhas do Meta Ads para o WhatsApp. Envie marcações de eventos de conversão (CAPI) impecáveis e diminua seu CPA educando muito mais o algoritmo.
            </p>
          </div>

          {/* Card 2: Medium Span */}
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-white dark:bg-card p-8 sm:p-10 shadow-sm transition hover:shadow-lg relative overflow-hidden group">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="mb-4 text-xl font-bold text-foreground">Aqueça o Meta Ads com CAPI</h3>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              Com a nossa Conversão Offline (CAPI), enviamos de volta para o Meta exatamente quem comprou. Suas campanhas ficam brutalmente mais inteligentes.
            </p>
          </div>

          {/* Card 3: Medium Span */}
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-white dark:bg-card p-8 sm:p-10 shadow-sm transition hover:shadow-lg relative overflow-hidden group">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h3 className="mb-4 text-xl font-bold text-foreground">ROI por Campanha em Tempo Real</h3>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
              Descubra na hora qual canal traz o melhor lead. Saiba qual ad queima dinheiro e qual dobra seu faturamento com relatórios de performance ao vivo.
            </p>
          </div>

          {/* Card 4: Large Span */}
          <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-white dark:bg-card p-8 sm:p-10 shadow-sm transition hover:shadow-lg relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 relative z-10">
              <Shield className="h-7 w-7" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-foreground relative z-10">Copilot de IA Lendo o Jogo</h3>
            <p className="text-muted-foreground text-base leading-relaxed relative z-10 max-w-md">
              Enquanto o seu time ou sistema atende pelo WhatsApp, nosso Copilot acompanha as conversas silenciosamente de fundo, avaliando padrões e classificando conexões valiosas (Lead Qualificado, Venda) sem trabalho braçal.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
