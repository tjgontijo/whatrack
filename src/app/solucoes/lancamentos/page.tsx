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
  title: "WhaTrack para Lançadores | ROI em tempo real no seu lançamento",
  description:
    "Rastreie do clique no anúncio até o fechamento no WhatsApp. Veja o ROI durante o carrinho aberto. Teste grátis por 7 dias.",
  openGraph: {
    title: "WhaTrack para Lançadores | ROI em tempo real no seu lançamento",
    description:
      "Rastreie do clique no anúncio até o fechamento no WhatsApp. Veja o ROI durante o carrinho aberto.",
    type: "website",
  },
};

export default function LancamentosPage() {
  const content = LANDING_CONTENT.lancadores;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader variant="lancadores" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="lancadores" />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  );
}
