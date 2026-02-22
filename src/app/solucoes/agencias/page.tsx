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
  title: "WhaTrack para Agências | Prove o ROI dos seus clientes",
  description:
    "Conecte os anúncios do seu cliente às vendas no WhatsApp. Mostre relatórios de ROI que ninguém questiona. Teste grátis por 7 dias.",
  openGraph: {
    title: "WhaTrack para Agências | Prove o ROI dos seus clientes",
    description:
      "Conecte os anúncios do seu cliente às vendas no WhatsApp. Mostre relatórios de ROI que ninguém questiona.",
    type: "website",
  },
};

export default function AgenciasPage() {
  const content = LANDING_CONTENT.agencias;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader variant="agencias" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="agencias" />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  );
}
