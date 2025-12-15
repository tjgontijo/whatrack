import { AlertCircle, TrendingDown, Users, MessageSquare } from "lucide-react";

const problems = [
  {
    icon: MessageSquare,
    title: "Leads se perdem nas mensagens",
    description:
      "Você recebe 50 leads por dia no WhatsApp, mas não sabe qual virou cliente, qual foi embora e qual está em negociação.",
  },
  {
    icon: TrendingDown,
    title: "Não consegue devolver dados para Meta",
    description:
      "Sem saber quem comprou, você não consegue enviar conversões de volta para o Meta. Suas campanhas ficam cegas.",
  },
  {
    icon: Users,
    title: "Impossível medir performance do time",
    description:
      "Qual atendente vende mais? Qual campanha traz cliente melhor? Você decide no feeling, não em dados.",
  },
  {
    icon: AlertCircle,
    title: "Múltiplas fontes, zero visibilidade",
    description:
      "Leads vêm do WhatsApp, Instagram, Google, site... mas você não consegue ver tudo em um lugar. Cada ferramenta é uma silos.",
  },
];

export function ProblemSection() {
  return (
    <section id="why" className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
            Você vende pelo WhatsApp, mas não sabe quanto está vendendo
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Sem visibilidade do funil completo, você perde dinheiro em campanhas que não funcionam e deixa de
            escalar o que realmente vende.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.title}
                className="rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-card p-8 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                  <Icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{problem.title}</h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
