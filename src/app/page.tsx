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

export default function HomePage() {
  const content = LANDING_CONTENT.generic;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader variant="generic" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="generic" />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  );
}
