import { Metadata } from "next";
import {
  LandingHeader,
  LandingHero,
  LandingProblem,
  LandingSolution,
  LandingHowItWorks,
  LandingPricing,
  LandingCTA,
  LandingFooter,
  LANDING_CONTENT,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "WhaTrack para Empresas | Saiba de onde vêm seus clientes",
  description:
    "Veja qual propaganda traz mais clientes para seu WhatsApp. Simples de usar, sem complicação. Teste grátis por 7 dias.",
  openGraph: {
    title: "WhaTrack para Empresas | Saiba de onde vêm seus clientes",
    description:
      "Veja qual propaganda traz mais clientes para seu WhatsApp. Simples de usar, sem complicação.",
    type: "website",
  },
};

export default function EmpresasPage() {
  const content = LANDING_CONTENT.empresas;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader variant="empresas" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="empresas" />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  );
}
