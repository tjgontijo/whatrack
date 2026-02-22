import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LandingVariant } from "./types";

interface Plan {
  name: string;
  subtitle: string;
  description: string;
  price: string;
  priceValue: string;
  pricePeriod: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const plans: Plan[] = [
  {
    name: "Essencial",
    subtitle: "Até 500 conversas/mês",
    description: "Para começar a rastrear suas vendas com clareza.",
    price: "R$",
    priceValue: "197",
    pricePeriod: "/mês",
    features: [
      "Veja de onde vem cada lead",
      "1 número de WhatsApp conectado",
      "Relatórios de vendas por campanha",
      "Assistente IA que identifica compradores",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Profissional",
    subtitle: "Para agências e times de vendas",
    description: "Automação completa e múltiplas conexões.",
    price: "R$",
    priceValue: "297",
    pricePeriod: "/mês",
    features: [
      "Tudo do Essencial",
      "Até 3 números de WhatsApp",
      "Relatórios de ROI em tempo real",
      "Múltiplas contas de anúncio",
      "Dados de venda enviados pro Meta",
    ],
    cta: "Começar grátis",
    highlighted: true,
  },
  {
    name: "Operação",
    subtitle: "Múltiplos clientes ou alto volume",
    description: "Para quem gerencia operações maiores.",
    price: "R$",
    priceValue: "497",
    pricePeriod: "/mês",
    features: [
      "Tudo do Profissional",
      "WhatsApp ilimitado",
      "Contas de anúncio ilimitadas",
      "Suporte prioritário via WhatsApp",
      "Integrações personalizadas",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
];

interface LandingPricingProps {
  variant?: LandingVariant;
}

export function LandingPricing({ variant = "generic" }: LandingPricingProps) {
  // Customize headline based on variant
  const headlines: Record<LandingVariant, { title: string; subtitle: string }> = {
    generic: {
      title: "Escolha seu plano e teste por 7 dias",
      subtitle:
        "Comece grátis hoje. Se em 7 dias você não ver claramente de onde vêm suas vendas, cancele com um clique.",
    },
    agencias: {
      title: "Planos para sua agência",
      subtitle:
        "Gerencie múltiplos clientes em um único painel. Teste grátis por 7 dias.",
    },
    lancadores: {
      title: "Planos para seu lançamento",
      subtitle:
        "ROI em tempo real durante o carrinho aberto. Teste grátis por 7 dias.",
    },
    empresas: {
      title: "Planos para sua empresa",
      subtitle:
        "Simples de usar, sem complicação. Teste grátis por 7 dias.",
    },
  };

  const headline = headlines[variant];

  return (
    <section
      id="planos"
      className="relative bg-gradient-to-b from-background to-card py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge
            variant="secondary"
            className="mx-auto bg-primary/10 text-primary uppercase tracking-wider font-bold text-xs py-1 px-3"
          >
            Planos & Preços
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight">
            {headline.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mt-4">
            {headline.subtitle}
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
                  <Badge className="bg-primary text-primary-foreground">
                    Mais escolhido
                  </Badge>
                </div>
              )}

              <div className="mb-6 space-y-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {plan.subtitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">
                    {plan.price}
                  </span>
                  <span className="text-3xl font-bold text-foreground">
                    {plan.priceValue}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.pricePeriod}
                  </span>
                </div>
              </div>

              <div className="mb-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className={`w-full h-12 text-sm font-semibold tracking-wide ${
                  plan.highlighted
                    ? "shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
                    : ""
                }`}
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href="/auth/sign-up">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
