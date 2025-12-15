import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Insights",
    subtitle: "Para gestores de tráfego",
    description: "Rastreie campanhas e prove ROI de cada real gasto em mídia.",
    price: "A partir de",
    priceValue: "R$ 990",
    pricePeriod: "/mês",
    features: [
      "Dashboard de funil completo",
      "Rastreamento de campanhas e UTMs",
      "Alertas de leads quentes",
      "Relatórios de ROI por campanha",
      "Integração com Meta Ads",
    ],
    cta: "Começar agora",
    highlighted: false,
  },
  {
    name: "Operação",
    subtitle: "Para clínicas, academias e franquias",
    description: "Controle total de agendamentos, comparecimentos e vendas.",
    price: "Sob",
    priceValue: "consulta",
    pricePeriod: "",
    features: [
      "Tudo do plano Insights",
      "Controle de atendentes e unidades",
      "Gestão de agendamentos",
      "Relatórios de performance do time",
      "Suporte dedicado para onboarding",
    ],
    cta: "Falar com vendas",
    highlighted: true,
  },
  {
    name: "Enterprise",
    subtitle: "Para squads e operações complexas",
    description: "Personalizações, integrações avançadas e governança multi-equipe.",
    price: "Fale com",
    priceValue: "o time",
    pricePeriod: "",
    features: [
      "Tudo do plano Operação",
      "Integrações avançadas e webhooks",
      "Workspaces e permissões customizadas",
      "Roadmap compartilhado",
      "SLA garantido",
    ],
    cta: "Conversar",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative bg-gradient-to-b from-background to-card py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge variant="secondary" className="mx-auto bg-primary/10 text-primary">
            Planos
          </Badge>
          <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
            Planos para cada fase do seu crescimento
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Escolha o plano que faz sentido para você agora. Sempre é possível evoluir depois.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 lg:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition ${
                plan.highlighted
                  ? "border-primary bg-gradient-to-br from-primary/10 to-card shadow-xl ring-1 ring-primary/20"
                  : "border-border bg-card shadow-sm hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Mais popular</Badge>
                </div>
              )}

              <div className="mb-6 space-y-2">
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm font-medium text-muted-foreground">{plan.subtitle}</p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6 space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">{plan.price}</span>
                  <span className="text-3xl font-bold text-foreground">{plan.priceValue}</span>
                  <span className="text-sm text-muted-foreground">{plan.pricePeriod}</span>
                </div>
              </div>

              <div className="mb-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href="https://wa.me/5561999999999" target="_blank" rel="noreferrer">
                  {plan.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
