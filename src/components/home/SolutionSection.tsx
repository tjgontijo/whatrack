import { CheckCircle2, BarChart3, Zap, Shield } from "lucide-react";

const solutions = [
  {
    icon: CheckCircle2,
    title: "Rastreie cada lead até a venda",
    description:
      "Cada contato que chega no WhatsApp vira um registro completo: origem, campanha, atendente, agendamento e venda final.",
    color: "success",
  },
  {
    icon: BarChart3,
    title: "Veja quanto cada campanha vende",
    description:
      "Descubra qual canal traz cliente bom, qual gera mais ticket e qual está queimando dinheiro. Dados reais, não estimativas.",
    color: "primary",
  },
  {
    icon: Zap,
    title: "Devolva conversões para Meta",
    description:
      "Com dados de quem comprou, você consegue enviar conversões de volta para o Meta. Suas campanhas ficam mais inteligentes.",
    color: "chart-3",
  },
  {
    icon: Shield,
    title: "Integre múltiplas fontes",
    description:
      "WhatsApp, Instagram, Google, site, email... Todos os leads em um painel. Sem trocar de ferramenta, sem bagunçar sua operação.",
    color: "warning",
  },
];

const colorMap = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  "chart-3": "bg-chart-3/10 text-chart-3",
  warning: "bg-warning/10 text-warning",
};

export function SolutionSection() {
  return (
    <section className="relative bg-gradient-to-b from-card to-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
            WhatRack: Seu radar de vendas
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Conectamos todos os seus canais de vendas em um painel inteligente que mostra exatamente o que
            funciona e o que não funciona.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {solutions.map((solution) => {
            const Icon = solution.icon;
            const bgColor = colorMap[solution.color as keyof typeof colorMap];

            return (
              <div
                key={solution.title}
                className="rounded-2xl border border-border bg-card p-8 shadow-sm transition hover:shadow-lg hover:border-muted-foreground/20"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${bgColor}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">{solution.title}</h3>
                <p className="text-muted-foreground">{solution.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
