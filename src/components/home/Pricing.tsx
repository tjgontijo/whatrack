import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    subtitle: "Para quem está começando",
    description: "Ideal para pequenas operações e lançamentos iniciais.",
    price: "R$",
    priceValue: "197",
    pricePeriod: "/mês",
    features: [
      "CRM Básico",
      "1 Conexão de WhatsApp",
      "Rastreamento básico de Meta Ads",
      "Suporte por email",
    ],
    cta: "Começar Teste Grátis",
    highlighted: false,
  },
  {
    name: "Growth",
    subtitle: "Para agências e lançadores",
    description: "Automação completa para times em crescimento.",
    price: "R$",
    priceValue: "297",
    pricePeriod: "/mês",
    features: [
      "Tudo do Starter",
      "Até 3 Conexões de WhatsApp",
      "Sincronização completa de Meta Ads",
      "Automações e Respostas Rápidas",
      "Relatórios de ROI em tempo real",
    ],
    cta: "Testar por 7 Dias",
    highlighted: true,
  },
  {
    name: "Pro Scale",
    subtitle: "Para grandes operações",
    description: "Volume intensivo, dezenas de contas e integrações.",
    price: "R$",
    priceValue: "497",
    pricePeriod: "/mês",
    features: [
      "Tudo do Growth",
      "Conexões ilimitadas de WhatsApp",
      "Sync focado em Conversão Offline (CAPI)",
      "Webhooks e integrações avançadas",
      "Suporte prioritário via WhatsApp",
    ],
    cta: "Experimentar Agora",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative bg-gradient-to-b from-background to-card py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-0">
        <div className="mb-16 space-y-4 text-center">
          <Badge variant="secondary" className="mx-auto bg-primary/10 text-primary uppercase tracking-wider font-bold text-xs py-1 px-3">
            Planos & Preços
          </Badge>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight">
            Escale sua operação com clareza
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mt-4">
            Escolha o plano ideal e teste a ferramenta por <strong className="text-foreground">7 dias grátis</strong> sem compromisso. Cancele quando quiser.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 lg:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition ${plan.highlighted
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
                className={`w-full h-12 text-sm font-semibold tracking-wide ${plan.highlighted ? 'shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5' : ''}`}
                variant={plan.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href="/auth/sign-up">
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
