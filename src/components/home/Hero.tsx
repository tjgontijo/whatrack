import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const highlights = [
  "Rastreie leads, agendamentos e vendas em um painel",
  "Saiba exatamente o Custo de Aquisição (CPA) real",
  "Integração instantânea com a API do Meta Ads",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background text-foreground pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 -top-40 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center px-6 sm:px-8">
        <Badge variant="secondary" className="mb-8 w-fit bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest">
          O Fim do achismo nas vendas
        </Badge>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-7xl max-w-4xl text-foreground !leading-[1.1]">
          Pare de perder conversões. Rastreie <span className="text-primary">cada lead e venda</span> num só lugar.
        </h1>

        <p className="mt-8 text-xl text-muted-foreground sm:text-2xl max-w-3xl leading-relaxed">
          Nossa Inteligência Artificial acompanha seus atendimentos no WhatsApp, descobre quem comprou e <span className="text-foreground font-semibold">devolve a conversão (CAPI) para marcar o Meta Ads</span> em tempo real.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full max-w-md sm:max-w-none">
          <Button
            size="lg"
            className="h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1"
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
            className="h-14 px-8 text-lg font-bold border-2"
            asChild
          >
            <Link href="#pricing">Ver Planos e Preços</Link>
          </Button>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 text-sm text-muted-foreground font-medium">
          {highlights.map((highlight) => (
            <div key={highlight} className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        {/* Hero Mockup or Abstract Dashboard preview */}
        <div className="mt-20 w-full relative">
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/30 to-transparent rounded-2xl blur-lg" />
          <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xl flex flex-col">
            <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/30">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="h-[300px] sm:h-[400px] bg-gradient-to-br from-background to-muted/20 w-full flex items-center justify-center p-8">
              {/* Abstract placeholder for the dashboard map/funnel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full h-full max-w-4xl opacity-80">
                <div className="bg-card border border-border/40 rounded-xl p-6 flex flex-col gap-4 shadow-sm h-full">
                  <div className="h-4 w-1/3 bg-muted rounded-full" />
                  <div className="h-8 w-2/3 bg-emerald-500/10 text-emerald-600 rounded-md flex items-center px-3 font-mono font-bold">R$ 14.500</div>
                  <div className="flex-1 rounded-lg border border-dashed border-border flex items-end p-2 gap-2">
                    <div className="w-full bg-primary/20 h-1/3 rounded-sm" />
                    <div className="w-full bg-primary/40 h-2/3 rounded-sm" />
                    <div className="w-full bg-primary h-full rounded-sm shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                  </div>
                </div>
                <div className="hidden md:flex bg-card border border-border/40 rounded-xl p-6 flex-col gap-4 shadow-sm h-full">
                  <div className="h-4 w-1/2 bg-muted rounded-full" />
                  <div className="space-y-3 mt-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 h-3 bg-muted/50 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden md:flex bg-card border border-border/40 rounded-xl p-6 flex-col gap-4 shadow-sm h-full">
                  <div className="h-4 w-1/3 bg-muted rounded-full" />
                  <div className="h-full flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" className="stroke-muted fill-none stroke-[8] opacity-20" />
                        <circle cx="50" cy="50" r="40" className="stroke-primary fill-none stroke-[8]" strokeDasharray="251" strokeDashoffset="60" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl text-foreground">76%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
