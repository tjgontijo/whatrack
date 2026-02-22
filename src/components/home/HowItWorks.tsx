import { Plug, Database, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    number: "01",
    icon: Plug,
    title: "Conecte seu Meta Ads e WhatsApp",
    description: "Integração feita em 2 minutos via QR Code e Login Seguro. Sem códigos complexos, sem suporte técnico demorado.",
  },
  {
    number: "02",
    icon: Database,
    title: "Copilot Monitora o Funil",
    description: "Nossos Agentes Copilot de IA leem as conversas do WhatsApp em tempo real, sempre cruzando as conversões com o Meta Ads originais.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Retroalimente a Meta (CAPI)",
    description: "O Whatrack devolve marcações perfeitas do comprador para a API de Conversões. O Meta Ads aprende e reduz o seu custo por venda diariamente.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-[#f8f9fa] dark:bg-muted/10 border-y border-border/50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge variant="secondary" className="mx-auto bg-primary/10 text-primary border-transparent px-4 py-1.5 uppercase tracking-widest text-xs font-bold">
            Como Funciona
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight max-w-2xl mx-auto">
            Visibilidade total em <span className="text-primary">3 passos simples</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground font-medium mt-4">
            Em menos de 10 minutos você implementa o Whatrack sem depender da equipe de TI e já enxerga os dados reais.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 mt-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative group">
                {/* Connector line on desktop */}
                {index < steps.length - 1 && (
                  <div className="absolute right-0 top-12 hidden w-full translate-x-1/2 items-center lg:flex pointer-events-none">
                    <div className="h-px w-full bg-gradient-to-r from-border to-transparent" />
                  </div>
                )}

                <div className="flex flex-col items-start bg-white dark:bg-card p-8 rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-lg relative z-10 h-full">
                  <div className="mb-6 flex items-center justify-between w-full">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-5xl font-black text-muted/30 select-none">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-foreground leading-tight">{step.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
