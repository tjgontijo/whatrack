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
} from '@/components/landing'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'

export default async function HomePage() {
  const content = LANDING_CONTENT.agencias
  const plans = await listPublicBillingPlans()

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <LandingHeader variant="agencias" />
      <LandingHero content={content.hero} />
      <LandingProblem content={content.problem} />
      <LandingSolution content={content.solution} />
      <LandingHowItWorks content={content.howItWorks} />
      <LandingPricing variant="agencias" plans={plans} />
      <LandingCTA content={content.cta} />
      <LandingFooter />
    </div>
  )
}
