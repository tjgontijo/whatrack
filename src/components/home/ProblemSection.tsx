import { AlertCircle, TrendingDown, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const problems = [
  {
    icon: MessageSquare,
    title: "Vendas fora do radar da Meta",
    description: "Seu time de vendas fecha negócios todo dia pelo WhatsApp, mas o Meta Ads não fica sabendo. O rastreamento quebra na saída do anúncio.",
  },
  {
    icon: TrendingDown,
    title: "O algoritmo não aprende",
    description: "Se o Meta Ads achar que o seu cliente só clicou e foi embora, ele nunca vai encontrar compradores reais para você. Resultado: custo por lead cada vez mais alto.",
  },
  {
    icon: Users,
    title: "Leads frios dominam o tempo",
    description: "Sem agentes de inteligência para qualificar os contatos e organizar as prioridades, o seu time gasta energia e horas com os leads errados.",
  },
  {
    icon: AlertCircle,
    title: "Ausência de Inteligência",
    description: "Você não tem ideia do quão perto o cliente está de comprar, e perde vendas simples porque o volume e o funil se confundem.",
  },
];

export function ProblemSection() {
  return (
    <section id="why" className="relative bg-[#f8f9fa] dark:bg-muted/10 border-y border-border/50 py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0 relative z-10">
        <div className="mb-16 space-y-4 text-center">
          <Badge variant="secondary" className="bg-destructive/10 text-destructive border-transparent px-4 py-1.5 uppercase tracking-widest text-xs font-bold">
            O Problema Atual
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight max-w-3xl mx-auto">
            Você atrai leads todos os dias e não sabe <span className="text-destructive">onde o dinheiro fica.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground font-medium mt-4">
            Sem rastrear de ponta a ponta, seu funil tem vazamentos gravíssimos. Você queima margem de lucro escalando as coisas erradas.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-12">
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.title}
                className="bg-white dark:bg-card rounded-2xl border border-border/60 p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 relative group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" />
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20 relative z-10">
                  <Icon className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground relative z-10 leading-tight">{problem.title}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed relative z-10">{problem.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
