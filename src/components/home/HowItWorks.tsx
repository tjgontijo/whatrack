import { Plug, Database, TrendingUp } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Plug,
    title: "Conecte seus canais",
    description:
      "Integre WhatsApp, Instagram, Google, site e outras fontes. Sem código, sem complicação. Tudo funciona junto.",
  },
  {
    number: 2,
    icon: Database,
    title: "Organize o funil",
    description:
      "Cada lead recebe um histórico completo: de onde veio, quem atendeu, se agendou, se compareceu e se comprou.",
  },
  {
    number: 3,
    icon: TrendingUp,
    title: "Meça e otimize",
    description:
      "Veja faturamento por campanha, por atendente, por canal. Corte o que não funciona, escale o que vende.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
            Três passos para ter visibilidade total
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Implementação rápida, sem bagunçar sua operação. Em poucos dias você já está vendo dados reais.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute -right-4 top-12 hidden h-0.5 w-8 bg-gradient-to-r from-primary to-transparent sm:block" />
                )}

                <div className="rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-card p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {step.number}
                    </div>
                    <Icon className="h-6 w-6 text-primary" />
                  </div>

                  <h3 className="mb-3 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline visual for mobile */}
        <div className="mt-12 space-y-4 sm:hidden">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {step.number}
                </div>
                {index < steps.length - 1 && <div className="h-8 w-0.5 bg-primary/20" />}
              </div>
              <div className="pb-4">
                <h4 className="font-semibold text-foreground">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
